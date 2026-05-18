package com.atomquest.goaltracker.controller;

import com.atomquest.goaltracker.dto.audit.AuditUnlockDtos;
import com.atomquest.goaltracker.security.AppUserPrincipal;
import com.atomquest.goaltracker.service.AuditUnlockService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Phase 10 — Audit Trail & Goal Unlock Controller.
 *
 * Audit endpoints:
 *   GET /api/audit                        → All audit logs (Admin, paginated)
 *   GET /api/audit/entity/{type}/{id}     → Entity-specific audit history
 *
 * Unlock request endpoints:
 *   POST /api/unlock-requests             → Employee submits an unlock request
 *   GET  /api/unlock-requests             → Admin/Manager lists requests
 *   GET  /api/unlock-requests/my          → Employee's own requests
 *   PATCH /api/unlock-requests/{id}/approve → Admin approves → unlocks goal
 *   PATCH /api/unlock-requests/{id}/deny    → Admin denies
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "Audit & Unlock", description = "Audit trail and goal unlock request management")
@SecurityRequirement(name = "Bearer Auth")
public class AuditUnlockController {

    private final AuditUnlockService auditUnlockService;

    // ── Audit Trail ───────────────────────────────────────────────────────────

    @GetMapping("/api/audit")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Paginated full audit log (Admin only)")
    public ResponseEntity<AuditUnlockDtos.AuditPageResponse> getAllAudit(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false)    String entityType,
            @RequestParam(required = false)    String action) {

        return ResponseEntity.ok(auditUnlockService.getAuditLog(page, size, entityType, action));
    }

    @GetMapping("/api/audit/entity/{entityType}/{entityId}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(summary = "Audit history for a specific entity")
    public ResponseEntity<List<AuditUnlockDtos.AuditEntryDto>> getEntityAudit(
            @PathVariable String entityType,
            @PathVariable UUID entityId) {

        return ResponseEntity.ok(auditUnlockService.getEntityAudit(entityType, entityId));
    }

    // ── Unlock Requests ───────────────────────────────────────────────────────

    @PostMapping("/api/unlock-requests")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    @Operation(
            summary = "Submit a goal unlock request",
            description = "Employee submits a reason why a locked goal needs to be edited. " +
                    "Admin can then approve and the goal becomes editable again.")
    public ResponseEntity<AuditUnlockDtos.UnlockRequestDto> submitUnlockRequest(
            @Valid @RequestBody AuditUnlockDtos.CreateUnlockRequestDto body,
            @AuthenticationPrincipal AppUserPrincipal principal) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(auditUnlockService.submitUnlockRequest(body, principal.getUserId()));
    }

    @GetMapping("/api/unlock-requests")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "List all unlock requests (Admin/Manager)")
    public ResponseEntity<List<AuditUnlockDtos.UnlockRequestDto>> listUnlockRequests(
            @RequestParam(required = false) String status) {

        return ResponseEntity.ok(auditUnlockService.listUnlockRequests(status));
    }

    @GetMapping("/api/unlock-requests/my")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    @Operation(summary = "My unlock requests")
    public ResponseEntity<List<AuditUnlockDtos.UnlockRequestDto>> myUnlockRequests(
            @AuthenticationPrincipal AppUserPrincipal principal) {

        return ResponseEntity.ok(auditUnlockService.getMyUnlockRequests(principal.getUserId()));
    }

    @PatchMapping("/api/unlock-requests/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Admin approves unlock request — goal becomes editable")
    public ResponseEntity<AuditUnlockDtos.UnlockRequestDto> approveUnlock(
            @PathVariable UUID id,
            @Valid @RequestBody AuditUnlockDtos.ResolveUnlockRequestDto body,
            @AuthenticationPrincipal AppUserPrincipal principal) {

        return ResponseEntity.ok(
                auditUnlockService.resolveUnlockRequest(id, "APPROVED", body.getNote(), principal.getUserId()));
    }

    @PatchMapping("/api/unlock-requests/{id}/deny")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Admin denies unlock request")
    public ResponseEntity<AuditUnlockDtos.UnlockRequestDto> denyUnlock(
            @PathVariable UUID id,
            @Valid @RequestBody AuditUnlockDtos.ResolveUnlockRequestDto body,
            @AuthenticationPrincipal AppUserPrincipal principal) {

        return ResponseEntity.ok(
                auditUnlockService.resolveUnlockRequest(id, "DENIED", body.getNote(), principal.getUserId()));
    }
}