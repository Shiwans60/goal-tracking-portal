package com.atomquest.goaltracker.controller;

import com.atomquest.goaltracker.entity.AuditLog;
import com.atomquest.goaltracker.repository.AuditLogRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/audit")
@RequiredArgsConstructor
@Tag(name = "Audit", description = "Audit trail — read-only, Admin only")
@SecurityRequirement(name = "Bearer Auth")
public class AuditController {

    private final AuditLogRepository auditLogRepository;

    /**
     * GET /api/audit/entity/{type}/{id}
     * Returns the full change history for a single entity (e.g. a Goal).
     */
    @GetMapping("/entity/{entityType}/{entityId}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(summary = "Get audit history for a specific entity")
    public ResponseEntity<List<AuditEntryResponse>> getEntityAudit(
            @PathVariable String entityType,
            @PathVariable UUID entityId) {

        List<AuditEntryResponse> entries = auditLogRepository
                .findByEntityTypeAndEntityIdOrderByCreatedAtDesc(entityType, entityId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(entries);
    }

    /**
     * GET /api/audit?page=0&size=50
     * Paginated full audit log — Admin only.
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Paginated full audit log (Admin only)")
    public ResponseEntity<List<AuditEntryResponse>> getAllAudit(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "50") int size) {

        PageRequest pr = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<AuditLog> result = auditLogRepository.findAllByOrderByCreatedAtDesc(pr);

        List<AuditEntryResponse> entries = result.getContent()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(entries);
    }

    // ── Inner DTO ─────────────────────────────────────────────────────────────

    @Data
    public static class AuditEntryResponse {
        private UUID   id;
        private String entityType;
        private UUID   entityId;
        private String action;
        private String performedById;
        private String performedByName;
        private String oldValue;
        private String newValue;
        private OffsetDateTime createdAt;
    }

    private AuditEntryResponse toResponse(AuditLog log) {
        AuditEntryResponse r = new AuditEntryResponse();
        r.setId(log.getId());
        r.setEntityType(log.getEntityType());
        r.setEntityId(log.getEntityId());
        r.setAction(log.getAction());
        if (log.getPerformedBy() != null) {
            r.setPerformedById(log.getPerformedBy().getId().toString());
            r.setPerformedByName(log.getPerformedBy().getName());
        }
        r.setOldValue(log.getOldValue());
        r.setNewValue(log.getNewValue());
        r.setCreatedAt(log.getCreatedAt());
        return r;
    }
}