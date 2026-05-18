package com.atomquest.goaltracker.controller;

import com.atomquest.goaltracker.dto.goal.GoalDtos;
import com.atomquest.goaltracker.security.AppUserPrincipal;
import com.atomquest.goaltracker.service.GoalService;
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

@RestController
@RequestMapping("/api/goals")
@RequiredArgsConstructor
@Tag(name = "Goals", description = "Goal lifecycle management")
@SecurityRequirement(name = "Bearer Auth")
public class GoalController {

    private final GoalService goalService;

    // ── Employee: own goals ──────────────────────────────────────────────────

    @GetMapping
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    @Operation(summary = "List my goals for the active (or specified) cycle")
    public ResponseEntity<List<GoalDtos.GoalResponse>> getMyGoals(
            @RequestParam(required = false) UUID cycleId,
            @AuthenticationPrincipal AppUserPrincipal principal) {

        return ResponseEntity.ok(goalService.getMyGoals(principal.getUserId(), cycleId));
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Get goal-sheet summary for the active cycle")
    public ResponseEntity<GoalDtos.GoalSheetSummary> getMySummary(
            @RequestParam(required = false) UUID cycleId,
            @AuthenticationPrincipal AppUserPrincipal principal) {

        return ResponseEntity.ok(
                goalService.getMyGoalSheetSummary(principal.getUserId(), cycleId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Get a single goal by ID")
    public ResponseEntity<GoalDtos.GoalResponse> getGoal(
            @PathVariable UUID id,
            @AuthenticationPrincipal AppUserPrincipal principal) {

        return ResponseEntity.ok(
                goalService.getGoalById(id, principal.getUserId(), principal.getRole()));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Create a new goal (starts in DRAFT status)")
    public ResponseEntity<GoalDtos.GoalResponse> createGoal(
            @Valid @RequestBody GoalDtos.CreateGoalRequest request,
            @AuthenticationPrincipal AppUserPrincipal principal) {

        GoalDtos.GoalResponse created = goalService.createGoal(request, principal.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Update a DRAFT or REWORK goal (owner only)")
    public ResponseEntity<GoalDtos.GoalResponse> updateGoal(
            @PathVariable UUID id,
            @Valid @RequestBody GoalDtos.UpdateGoalRequest request,
            @AuthenticationPrincipal AppUserPrincipal principal) {

        return ResponseEntity.ok(goalService.updateGoal(id, request, principal.getUserId()));
    }

    @PatchMapping("/{id}/submit")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Submit a DRAFT or REWORK goal for manager approval")
    public ResponseEntity<GoalDtos.GoalResponse> submitGoal(
            @PathVariable UUID id,
            @AuthenticationPrincipal AppUserPrincipal principal) {

        return ResponseEntity.ok(goalService.submitGoal(id, principal.getUserId()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Delete a DRAFT goal (owner only)")
    public ResponseEntity<Void> deleteGoal(
            @PathVariable UUID id,
            @AuthenticationPrincipal AppUserPrincipal principal) {

        goalService.deleteGoal(id, principal.getUserId());
        return ResponseEntity.noContent().build();
    }

    // ── Manager / Admin: team goals ──────────────────────────────────────────

    @GetMapping("/team")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(summary = "List all goals for the manager's direct reports")
    public ResponseEntity<List<GoalDtos.GoalResponse>> getTeamGoals(
            @RequestParam(required = false) UUID cycleId,
            @AuthenticationPrincipal AppUserPrincipal principal) {

        return ResponseEntity.ok(goalService.getTeamGoals(principal.getUserId(), cycleId));
    }

    /**
     * Phase 5 — Returns count of PENDING_APPROVAL goals for the manager's team.
     * Used by the dashboard badge.
     */
    @GetMapping("/team/pending-count")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(summary = "Count of team goals pending manager approval (for dashboard badge)")
    public ResponseEntity<GoalDtos.PendingApprovalCount> getTeamPendingCount(
            @AuthenticationPrincipal AppUserPrincipal principal) {

        GoalDtos.PendingApprovalCount result = new GoalDtos.PendingApprovalCount();
        result.setCount(goalService.countTeamPendingApproval(principal.getUserId()));
        return ResponseEntity.ok(result);
    }

    @PatchMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(summary = "Approve a PENDING_APPROVAL goal (locks it)")
    public ResponseEntity<GoalDtos.GoalResponse> approveGoal(
            @PathVariable UUID id,
            @AuthenticationPrincipal AppUserPrincipal principal) {

        return ResponseEntity.ok(goalService.approveGoal(id, principal.getUserId()));
    }

    @PatchMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(summary = "Reject a PENDING_APPROVAL goal with a mandatory note")
    public ResponseEntity<GoalDtos.GoalResponse> rejectGoal(
            @PathVariable UUID id,
            @Valid @RequestBody GoalDtos.RejectGoalRequest request,
            @AuthenticationPrincipal AppUserPrincipal principal) {

        return ResponseEntity.ok(
                goalService.rejectGoal(id, request.getNote(), principal.getUserId()));
    }

    @PatchMapping("/{id}/rework")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(summary = "Return a PENDING_APPROVAL goal for rework with a note")
    public ResponseEntity<GoalDtos.GoalResponse> returnForRework(
            @PathVariable UUID id,
            @Valid @RequestBody GoalDtos.RejectGoalRequest request,
            @AuthenticationPrincipal AppUserPrincipal principal) {

        return ResponseEntity.ok(
                goalService.returnForRework(id, request.getNote(), principal.getUserId()));
    }

    /**
     * Phase 5 — Manager inline edit on PENDING_APPROVAL goals before approval.
     * Only target, targetDate, and weightage can be changed.
     */
    @PatchMapping("/{id}/manager-edit")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(
            summary = "Manager inline edit of target/weightage on a PENDING_APPROVAL goal",
            description = "Allows manager to adjust target value, target date, or weightage before approving. Creates an audit trail entry.")
    public ResponseEntity<GoalDtos.GoalResponse> managerEditGoal(
            @PathVariable UUID id,
            @Valid @RequestBody GoalDtos.ManagerEditGoalRequest request,
            @AuthenticationPrincipal AppUserPrincipal principal) {

        return ResponseEntity.ok(
                goalService.managerEditGoal(id, request, principal.getUserId()));
    }
}