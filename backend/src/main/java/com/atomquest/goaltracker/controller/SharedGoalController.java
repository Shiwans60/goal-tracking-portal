package com.atomquest.goaltracker.controller;

import com.atomquest.goaltracker.dto.shared.SharedGoalDtos;
import com.atomquest.goaltracker.security.AppUserPrincipal;
import com.atomquest.goaltracker.service.SharedGoalService;
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
 * Phase 6 — Shared Goals REST API.
 *
 * Base path: /api/shared-goals
 *
 * Endpoints:
 *   POST   /api/shared-goals                        → Manager/Admin creates & pushes a shared goal
 *   GET    /api/shared-goals/mine                   → Employee views their received shared goals
 *   GET    /api/shared-goals/cycle/{cycleId}        → Manager/Admin lists all shared goals in a cycle
 *   GET    /api/shared-goals/parent/{parentGoalId}  → List assignments for a parent goal
 *   PATCH  /api/shared-goals/{id}/weightage         → Recipient updates their own weightage
 *   DELETE /api/shared-goals/{id}                   → Admin/Assigner removes an assignment
 */
@RestController
@RequestMapping("/api/shared-goals")
@RequiredArgsConstructor
@Tag(name = "Shared Goals", description = "Departmental KPI push to multiple employees")
@SecurityRequirement(name = "Bearer Auth")
public class SharedGoalController {

    private final SharedGoalService sharedGoalService;

    // ── Manager / Admin: create & assign ─────────────────────────────────────

    @PostMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(
            summary = "Create a shared goal and push it to multiple recipients",
            description = "Creates a parent/template goal (approved + locked) and provisions " +
                    "a read-only (except weightage) copy on each recipient's goal sheet."
    )
    public ResponseEntity<SharedGoalDtos.CreateSharedGoalResponse> createAndAssign(
            @Valid @RequestBody SharedGoalDtos.CreateSharedGoalRequest request,
            @AuthenticationPrincipal AppUserPrincipal principal) {

        SharedGoalDtos.CreateSharedGoalResponse response =
                sharedGoalService.createAndAssign(request, principal.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ── Employee: own received shared goals ───────────────────────────────────

    @GetMapping("/mine")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    @Operation(summary = "List shared goals assigned to me (optionally filtered by cycle)")
    public ResponseEntity<List<SharedGoalDtos.SharedGoalResponse>> getMySharedGoals(
            @RequestParam(required = false) UUID cycleId,
            @AuthenticationPrincipal AppUserPrincipal principal) {

        return ResponseEntity.ok(
                sharedGoalService.getMySharedGoals(principal.getUserId(), cycleId));
    }

    // ── Manager / Admin: oversight ────────────────────────────────────────────

    @GetMapping("/cycle/{cycleId}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(summary = "List all shared goals within a cycle")
    public ResponseEntity<List<SharedGoalDtos.SharedGoalResponse>> getSharedGoalsByCycle(
            @PathVariable UUID cycleId) {

        return ResponseEntity.ok(sharedGoalService.getSharedGoalsByCycle(cycleId));
    }

    @GetMapping("/parent/{parentGoalId}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(summary = "List all assignments for a given parent/template goal")
    public ResponseEntity<List<SharedGoalDtos.SharedGoalResponse>> getAssignmentsByParentGoal(
            @PathVariable UUID parentGoalId) {

        return ResponseEntity.ok(sharedGoalService.getAssignmentsByParentGoal(parentGoalId));
    }

    // ── Recipient: update weightage ───────────────────────────────────────────

    @PatchMapping("/{id}/weightage")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    @Operation(
            summary = "Update my weightage on a shared goal",
            description = "Recipients may only change the weightage. " +
                    "Goal title, description, target, and UoM are read-only."
    )
    public ResponseEntity<SharedGoalDtos.SharedGoalResponse> updateWeightage(
            @PathVariable UUID id,
            @Valid @RequestBody SharedGoalDtos.UpdateRecipientWeightageRequest request,
            @AuthenticationPrincipal AppUserPrincipal principal) {

        return ResponseEntity.ok(
                sharedGoalService.updateRecipientWeightage(id, request, principal.getUserId()));
    }

    // ── Admin / Assigner: remove assignment ───────────────────────────────────

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(
            summary = "Remove a shared goal assignment",
            description = "Removes the SharedGoal record and deletes the recipient's auto-created goal. " +
                    "Admin or the original assigner only."
    )
    public ResponseEntity<Void> removeAssignment(
            @PathVariable UUID id,
            @AuthenticationPrincipal AppUserPrincipal principal) {

        sharedGoalService.removeAssignment(id, principal.getUserId());
        return ResponseEntity.noContent().build();
    }
}