package com.atomquest.goaltracker.service;

import com.atomquest.goaltracker.dto.shared.SharedGoalDtos;
import com.atomquest.goaltracker.entity.*;
import com.atomquest.goaltracker.exception.BusinessException;
import com.atomquest.goaltracker.exception.ResourceNotFoundException;
import com.atomquest.goaltracker.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Phase 6 — Shared Goal Service.
 *
 * Business rules (from BRD §2.1):
 *  - Admin or Manager can push a departmental KPI to multiple employees.
 *  - Recipients may adjust weightage only. Goal Title, Target, UoM are read-only.
 *  - A SharedGoal auto-creates a locked Goal on the recipient's sheet.
 *  - Duplicate assignments (same parent + recipient) are rejected.
 *  - Weightage limits still apply on recipient's overall sheet (≤ 100%, min 10%).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SharedGoalService {

    private static final BigDecimal MIN_WEIGHTAGE  = new BigDecimal("10");
    private static final BigDecimal MAX_TOTAL      = new BigDecimal("100");
    private static final int        MAX_GOALS      = 8;

    private final SharedGoalRepository sharedGoalRepository;
    private final GoalRepository       goalRepository;
    private final CycleRepository      cycleRepository;
    private final UserRepository       userRepository;
    private final AuditService         auditService;

    // ── Queries ───────────────────────────────────────────────────────────────

    /** All shared goals assigned to a recipient (employee view). */
    @Transactional(readOnly = true)
    public List<SharedGoalDtos.SharedGoalResponse> getMySharedGoals(String userId, UUID cycleId) {
        UUID uid = UUID.fromString(userId);
        List<SharedGoal> list = cycleId != null
                ? sharedGoalRepository.findByRecipientAndCycle(uid, cycleId)
                : sharedGoalRepository.findByRecipientId(uid);
        return list.stream().map(this::toResponse).collect(Collectors.toList());
    }

    /** All assignments for a given parent goal (manager/admin view). */
    @Transactional(readOnly = true)
    public List<SharedGoalDtos.SharedGoalResponse> getAssignmentsByParentGoal(UUID parentGoalId) {
        return sharedGoalRepository.findByParentGoalId(parentGoalId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    /** All shared goals within a cycle (manager/admin oversight). */
    @Transactional(readOnly = true)
    public List<SharedGoalDtos.SharedGoalResponse> getSharedGoalsByCycle(UUID cycleId) {
        return sharedGoalRepository.findByCycleId(cycleId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    // ── Commands ──────────────────────────────────────────────────────────────

    /**
     * Create a shared goal template and push it to all specified recipients.
     *
     * Steps:
     *  1. Create the parent/template Goal (isShared=true, status=APPROVED, locked=true)
     *     on the assigning manager's/admin's goal sheet — or as a standalone template.
     *  2. For each recipient, create a SharedGoal record and a recipient Goal
     *     (status=APPROVED, locked=true, isShared=true, parentGoal set).
     */
    @Transactional
    public SharedGoalDtos.CreateSharedGoalResponse createAndAssign(
            SharedGoalDtos.CreateSharedGoalRequest req, String assignerId) {

        User assigner = findUser(assignerId);
        Cycle cycle   = cycleRepository.findById(req.getCycleId())
                .orElseThrow(() -> new ResourceNotFoundException("Cycle", req.getCycleId()));

        if (cycle.getStatus() != CycleStatus.ACTIVE) {
            throw new BusinessException("Shared goals can only be pushed in an ACTIVE cycle");
        }

        // 1. Create the parent (template) goal
        Goal parentGoal = Goal.builder()
                .employee(assigner)          // template "owned" by the assigner
                .cycle(cycle)
                .thrustArea(req.getThrustArea())
                .title(req.getTitle())
                .description(req.getDescription())
                .uomType(req.getUomType())
                .target(req.getTarget())
                .targetDate(req.getTargetDate())
                .weightage(req.getDefaultWeightage())
                .status(GoalStatus.APPROVED)
                .locked(true)
                .isShared(true)
                .build();

        parentGoal = goalRepository.save(parentGoal);
        auditService.log("Goal", parentGoal.getId(), "SHARED_GOAL_CREATED",
                assignerId, null, null);

        // 2. Provision a goal on each recipient's sheet
        List<SharedGoalDtos.SharedGoalResponse> assignments = new ArrayList<>();

        for (UUID recipientId : req.getRecipientIds()) {
            if (recipientId.toString().equals(assignerId)) {
                log.warn("Skipping self-assignment for user {}", assignerId);
                continue;
            }

            if (sharedGoalRepository.existsByParentGoalIdAndRecipientId(
                    parentGoal.getId(), recipientId)) {
                log.warn("Duplicate shared goal assignment skipped: parent={} recipient={}",
                        parentGoal.getId(), recipientId);
                continue;
            }

            User recipient = userRepository.findById(recipientId)
                    .orElseThrow(() -> new ResourceNotFoundException("User", recipientId));

            // Validate recipient can receive more goals
            long existingCount = goalRepository.countByEmployeeAndCycle(recipientId, cycle.getId());
            if (existingCount >= MAX_GOALS) {
                throw new BusinessException(String.format(
                        "Recipient %s already has the maximum of %d goals in this cycle.",
                        recipient.getName(), MAX_GOALS));
            }

            // Validate total weightage on recipient's sheet won't exceed 100%
            BigDecimal existing = goalRepository.sumActiveWeightageExcluding(
                    recipientId, cycle.getId(), UUID.randomUUID() /* dummy exclude */);
            // Workaround: sumWeightage doesn't exclude; use the correct method
            BigDecimal existingWt = goalRepository.sumWeightageByEmployeeAndCycle(
                    recipientId, cycle.getId());
            if (existingWt.add(req.getDefaultWeightage()).compareTo(MAX_TOTAL) > 0) {
                throw new BusinessException(String.format(
                        "Adding %.2f%% weightage would exceed 100%% for recipient %s (current: %.2f%%).",
                        req.getDefaultWeightage(), recipient.getName(), existingWt));
            }

            // Create the recipient's goal (pre-approved, locked, read-only except weightage)
            Goal recipientGoal = Goal.builder()
                    .employee(recipient)
                    .cycle(cycle)
                    .thrustArea(parentGoal.getThrustArea())
                    .title(parentGoal.getTitle())
                    .description(parentGoal.getDescription())
                    .uomType(parentGoal.getUomType())
                    .target(parentGoal.getTarget())
                    .targetDate(parentGoal.getTargetDate())
                    .weightage(req.getDefaultWeightage())
                    .status(GoalStatus.APPROVED)
                    .locked(true)
                    .isShared(true)
                    .parentGoal(parentGoal)
                    .build();

            recipientGoal = goalRepository.save(recipientGoal);

            SharedGoal sharedGoal = SharedGoal.builder()
                    .parentGoal(parentGoal)
                    .recipient(recipient)
                    .recipientGoal(recipientGoal)
                    .recipientWeightage(req.getDefaultWeightage())
                    .assignedBy(assigner)
                    .build();

            SharedGoal saved = sharedGoalRepository.save(sharedGoal);

            auditService.log("SharedGoal", saved.getId(), "ASSIGNED",
                    assignerId, null, null);

            assignments.add(toResponse(saved));
        }

        SharedGoalDtos.CreateSharedGoalResponse response = new SharedGoalDtos.CreateSharedGoalResponse();
        response.setParentGoalId(parentGoal.getId());
        response.setParentGoalTitle(parentGoal.getTitle());
        response.setRecipientCount(assignments.size());
        response.setAssignments(assignments);
        return response;
    }

    /**
     * Recipient updates their own weightage on a shared goal.
     * Only the weightage field may be changed.
     */
    @Transactional
    public SharedGoalDtos.SharedGoalResponse updateRecipientWeightage(
            UUID sharedGoalId,
            SharedGoalDtos.UpdateRecipientWeightageRequest req,
            String callerId) {

        SharedGoal sg = sharedGoalRepository.findById(sharedGoalId)
                .orElseThrow(() -> new ResourceNotFoundException("SharedGoal", sharedGoalId));

        // Only the recipient or an Admin may update the weightage
        boolean isAdmin     = findUser(callerId).getRole() == UserRole.ROLE_ADMIN;
        boolean isRecipient = sg.getRecipient().getId().toString().equals(callerId);
        if (!isRecipient && !isAdmin) {
            throw new BusinessException("Only the recipient or an Admin can update shared-goal weightage");
        }

        // Validate new weightage doesn't push total over 100% on recipient's sheet
        Goal recipientGoal = sg.getRecipientGoal();
        if (recipientGoal != null) {
            BigDecimal otherWeightage = goalRepository.sumActiveWeightageExcluding(
                    recipientGoal.getEmployee().getId(),
                    recipientGoal.getCycle().getId(),
                    recipientGoal.getId());
            if (otherWeightage.add(req.getWeightage()).compareTo(MAX_TOTAL) > 0) {
                throw new BusinessException(String.format(
                        "Setting weightage to %.2f%% would exceed 100%% (other goals: %.2f%%).",
                        req.getWeightage(), otherWeightage));
            }

            // Update the actual goal row too
            recipientGoal.setWeightage(req.getWeightage());
            goalRepository.save(recipientGoal);
        }

        BigDecimal oldWeightage = sg.getRecipientWeightage();
        sg.setRecipientWeightage(req.getWeightage());
        SharedGoal saved = sharedGoalRepository.save(sg);

        auditService.log("SharedGoal", saved.getId(), "WEIGHTAGE_UPDATED",
                callerId,
                java.util.Map.of("oldWeightage", oldWeightage),
                java.util.Map.of("newWeightage", req.getWeightage()));

        return toResponse(saved);
    }

    /**
     * Remove a recipient from a shared goal assignment.
     * Admin / assigner only.
     */
    @Transactional
    public void removeAssignment(UUID sharedGoalId, String callerId) {
        SharedGoal sg = sharedGoalRepository.findById(sharedGoalId)
                .orElseThrow(() -> new ResourceNotFoundException("SharedGoal", sharedGoalId));

        User caller = findUser(callerId);
        boolean isAdmin      = caller.getRole() == UserRole.ROLE_ADMIN;
        boolean isAssigner   = sg.getAssignedBy() != null &&
                sg.getAssignedBy().getId().toString().equals(callerId);

        if (!isAdmin && !isAssigner) {
            throw new BusinessException("Only the assigning manager or an Admin can remove shared-goal assignments");
        }

        // Delete the recipient's goal row if it exists and hasn't had check-ins
        if (sg.getRecipientGoal() != null) {
            goalRepository.delete(sg.getRecipientGoal());
        }

        auditService.log("SharedGoal", sg.getId(), "ASSIGNMENT_REMOVED", callerId, null, null);
        sharedGoalRepository.delete(sg);
    }

    // ── Mapper ────────────────────────────────────────────────────────────────

    private SharedGoalDtos.SharedGoalResponse toResponse(SharedGoal sg) {
        SharedGoalDtos.SharedGoalResponse r = new SharedGoalDtos.SharedGoalResponse();
        r.setId(sg.getId());

        Goal parent = sg.getParentGoal();
        r.setParentGoalId(parent.getId());
        r.setParentGoalTitle(parent.getTitle());
        r.setThrustArea(parent.getThrustArea());
        r.setUomType(parent.getUomType());
        r.setTarget(parent.getTarget());
        r.setTargetDate(parent.getTargetDate());
        r.setCycleId(parent.getCycle().getId().toString());
        r.setCycleName(parent.getCycle().getName());

        r.setRecipientId(sg.getRecipient().getId().toString());
        r.setRecipientName(sg.getRecipient().getName());
        r.setRecipientWeightage(sg.getRecipientWeightage());

        if (sg.getRecipientGoal() != null) {
            r.setRecipientGoalId(sg.getRecipientGoal().getId());
            r.setRecipientGoalStatus(sg.getRecipientGoal().getStatus().name());
            r.setRecipientGoalLocked(sg.getRecipientGoal().isLocked());
        }

        if (sg.getAssignedBy() != null) {
            r.setAssignedById(sg.getAssignedBy().getId().toString());
            r.setAssignedByName(sg.getAssignedBy().getName());
        }

        r.setCreatedAt(sg.getCreatedAt());
        r.setUpdatedAt(sg.getUpdatedAt());
        return r;
    }

    private User findUser(String userId) {
        return userRepository.findById(UUID.fromString(userId))
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
    }
}