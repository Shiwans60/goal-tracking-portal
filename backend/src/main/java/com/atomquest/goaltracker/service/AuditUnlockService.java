package com.atomquest.goaltracker.service;

import com.atomquest.goaltracker.dto.audit.AuditUnlockDtos;
import com.atomquest.goaltracker.entity.*;
import com.atomquest.goaltracker.exception.BusinessException;
import com.atomquest.goaltracker.exception.ResourceNotFoundException;
import com.atomquest.goaltracker.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Phase 10 — Audit & Unlock Service.
 *
 * Handles:
 *  - Paginated audit log querying with optional filters
 *  - Entity-specific audit history
 *  - Goal unlock request lifecycle: submit → approve/deny → unlock goal
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuditUnlockService {

    private final AuditLogRepository      auditLogRepository;
    private final UnlockRequestRepository unlockRequestRepository;
    private final GoalRepository          goalRepository;
    private final UserRepository          userRepository;
    private final AuditService            auditService;

    // ── Audit ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public AuditUnlockDtos.AuditPageResponse getAuditLog(
            int page, int size, String entityType, String action) {

        PageRequest pr = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<AuditLog> result = auditLogRepository.findAllByOrderByCreatedAtDesc(pr);

        // Post-filter in memory (small dataset optimization)
        List<AuditUnlockDtos.AuditEntryDto> entries = result.getContent().stream()
                .filter(a -> entityType == null || entityType.equalsIgnoreCase(a.getEntityType()))
                .filter(a -> action == null || action.equalsIgnoreCase(a.getAction()))
                .map(this::toAuditDto)
                .collect(Collectors.toList());

        AuditUnlockDtos.AuditPageResponse resp = new AuditUnlockDtos.AuditPageResponse();
        resp.setEntries(entries);
        resp.setPage(page);
        resp.setSize(size);
        resp.setTotalElements(result.getTotalElements());
        resp.setTotalPages(result.getTotalPages());
        return resp;
    }

    @Transactional(readOnly = true)
    public List<AuditUnlockDtos.AuditEntryDto> getEntityAudit(String entityType, UUID entityId) {
        return auditLogRepository
                .findByEntityTypeAndEntityIdOrderByCreatedAtDesc(entityType, entityId)
                .stream()
                .map(this::toAuditDto)
                .collect(Collectors.toList());
    }

    // ── Unlock Requests ───────────────────────────────────────────────────────

    @Transactional
    public AuditUnlockDtos.UnlockRequestDto submitUnlockRequest(
            AuditUnlockDtos.CreateUnlockRequestDto body, String userId) {

        Goal goal = goalRepository.findById(body.getGoalId())
                .orElseThrow(() -> new ResourceNotFoundException("Goal", body.getGoalId()));

        // Only employee who owns the goal can request unlock (or admin)
        User requester = findUser(userId);
        boolean isOwner = goal.getEmployee().getId().toString().equals(userId);
        boolean isAdmin = requester.getRole() == UserRole.ROLE_ADMIN;
        if (!isOwner && !isAdmin) {
            throw new BusinessException("Only the goal owner can request an unlock");
        }

        if (!goal.isLocked()) {
            throw new BusinessException("Goal is not locked — no unlock needed");
        }

        // Prevent duplicate pending requests
        if (unlockRequestRepository.existsByGoalIdAndStatusAndRequestedById(
                goal.getId(), "PENDING", UUID.fromString(userId))) {
            throw new BusinessException("An unlock request for this goal is already pending");
        }

        UnlockRequest req = UnlockRequest.builder()
                .goal(goal)
                .requestedBy(requester)
                .reason(body.getReason())
                .status("PENDING")
                .build();

        UnlockRequest saved = unlockRequestRepository.save(req);
        auditService.log("UnlockRequest", saved.getId(), "SUBMITTED", userId, null,
                java.util.Map.of("goalId", goal.getId(), "reason", body.getReason()));
        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public List<AuditUnlockDtos.UnlockRequestDto> listUnlockRequests(String status) {
        List<UnlockRequest> list = status != null
                ? unlockRequestRepository.findByStatusOrderByCreatedAtDesc(status)
                : unlockRequestRepository.findAll(Sort.by("createdAt").descending()).stream()
                .collect(Collectors.toList());
        return list.stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AuditUnlockDtos.UnlockRequestDto> getMyUnlockRequests(String userId) {
        return unlockRequestRepository
                .findByRequestedByIdOrderByCreatedAtDesc(UUID.fromString(userId))
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional
    public AuditUnlockDtos.UnlockRequestDto resolveUnlockRequest(
            UUID requestId, String newStatus, String note, String adminId) {

        UnlockRequest req = unlockRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("UnlockRequest", requestId));

        if (!"PENDING".equals(req.getStatus())) {
            throw new BusinessException("This request has already been resolved");
        }

        User admin = findUser(adminId);
        req.setStatus(newStatus);
        req.setResolvedBy(admin);
        req.setResolvedAt(OffsetDateTime.now());
        req.setResolutionNote(note);

        // If approved → unlock the goal and set status back to REWORK
        if ("APPROVED".equals(newStatus)) {
            Goal goal = req.getGoal();
            goal.setLocked(false);
            goal.setStatus(GoalStatus.REWORK);
            goal.setRejectionNote("Unlocked by admin: " + (note != null ? note : "Admin approved unlock"));
            goalRepository.save(goal);

            auditService.log("Goal", goal.getId(), "UNLOCKED", adminId, null,
                    java.util.Map.of("unlockRequestId", requestId, "reason", req.getReason()));
            log.info("Goal {} unlocked by admin {} (request {})", goal.getId(), adminId, requestId);
        }

        auditService.log("UnlockRequest", requestId, "RESOLVED_" + newStatus,
                adminId, null, java.util.Map.of("status", newStatus));

        return toDto(unlockRequestRepository.save(req));
    }

    // ── Mappers ───────────────────────────────────────────────────────────────

    private AuditUnlockDtos.AuditEntryDto toAuditDto(AuditLog a) {
        AuditUnlockDtos.AuditEntryDto dto = new AuditUnlockDtos.AuditEntryDto();
        dto.setId(a.getId());
        dto.setEntityType(a.getEntityType());
        dto.setEntityId(a.getEntityId());
        dto.setAction(a.getAction());
        if (a.getPerformedBy() != null) {
            dto.setPerformedById(a.getPerformedBy().getId().toString());
            dto.setPerformedByName(a.getPerformedBy().getName());
        }
        dto.setOldValue(a.getOldValue());
        dto.setNewValue(a.getNewValue());
        dto.setCreatedAt(a.getCreatedAt());
        return dto;
    }

    private AuditUnlockDtos.UnlockRequestDto toDto(UnlockRequest r) {
        AuditUnlockDtos.UnlockRequestDto dto = new AuditUnlockDtos.UnlockRequestDto();
        dto.setId(r.getId());
        dto.setGoalId(r.getGoal().getId());
        dto.setGoalTitle(r.getGoal().getTitle());
        dto.setRequestedById(r.getRequestedBy().getId().toString());
        dto.setRequestedByName(r.getRequestedBy().getName());
        dto.setReason(r.getReason());
        dto.setStatus(r.getStatus());
        if (r.getResolvedBy() != null) {
            dto.setResolvedById(r.getResolvedBy().getId().toString());
            dto.setResolvedByName(r.getResolvedBy().getName());
        }
        dto.setResolutionNote(r.getResolutionNote());
        dto.setResolvedAt(r.getResolvedAt());
        dto.setCreatedAt(r.getCreatedAt());
        return dto;
    }

    private User findUser(String userId) {
        return userRepository.findById(UUID.fromString(userId))
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
    }
}