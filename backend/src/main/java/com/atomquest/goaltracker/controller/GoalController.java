package com.atomquest.goaltracker.controller;

import com.atomquest.goaltracker.dto.goal.GoalDtos;
import com.atomquest.goaltracker.security.AppUserPrincipal;
import com.atomquest.goaltracker.service.GoalService;
import io.swagger.v3.oas.annotations.Operation;
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
public class GoalController {

    private final GoalService goalService;

    // ── Employee: own goals ──────────────────────────────────────────────────

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List my goals for the active cycle")
    public ResponseEntity<List<GoalDtos.GoalResponse>> getMyGoals(
            @RequestParam(required = false) UUID cycleId,
            @AuthenticationPrincipal AppUserPrincipal principal) {

        return ResponseEntity.ok(goalService.getMyGoals(principal.getUserId(), cycleId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get single goal by ID")
    public ResponseEntity<GoalDtos.GoalResponse> getGoal(
            @PathVariable UUID id,
            @AuthenticationPrincipal AppUserPrincipal principal) {

        return ResponseEntity.ok(goalService.getGoalById(id, principal.getUserId(), principal.getRole()));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Create a new goal (DRAFT)")
    public ResponseEntity<GoalDtos.GoalResponse> createGoal(
            @Valid @RequestBody GoalDtos.CreateGoalRequest request,
            @AuthenticationPrincipal AppUserPrincipal principal) {

        GoalDtos.GoalResponse created = goalService.createGoal(request, principal.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Update a DRAFT goal")
    public ResponseEntity<GoalDtos.GoalResponse> updateGoal(
            @PathVariable UUID id,
            @Valid @RequestBody GoalDtos.UpdateGoalRequest request,
            @AuthenticationPrincipal AppUserPrincipal principal) {

        return ResponseEntity.ok(goalService.updateGoal(id, request, principal.getUserId()));
    }

    @PatchMapping("/{id}/submit")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Submit a DRAFT goal for manager approval")
    public ResponseEntity<GoalDtos.GoalResponse> submitGoal(
            @PathVariable UUID id,
            @AuthenticationPrincipal AppUserPrincipal principal) {

        return ResponseEntity.ok(goalService.submitGoal(id, principal.getUserId()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Delete a DRAFT goal")
    public ResponseEntity<Void> deleteGoal(
            @PathVariable UUID id,
            @AuthenticationPrincipal AppUserPrincipal principal) {

        goalService.deleteGoal(id, principal.getUserId());
        return ResponseEntity.noContent().build();
    }

    // ── Manager: team goals ──────────────────────────────────────────────────

    @GetMapping("/team")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(summary = "List team goals (manager view)")
    public ResponseEntity<List<GoalDtos.GoalResponse>> getTeamGoals(
            @RequestParam(required = false) UUID cycleId,
            @AuthenticationPrincipal AppUserPrincipal principal) {

        return ResponseEntity.ok(goalService.getTeamGoals(principal.getUserId(), cycleId));
    }

    @PatchMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(summary = "Approve a submitted goal")
    public ResponseEntity<GoalDtos.GoalResponse> approveGoal(
            @PathVariable UUID id,
            @AuthenticationPrincipal AppUserPrincipal principal) {

        return ResponseEntity.ok(goalService.approveGoal(id, principal.getUserId()));
    }

    @PatchMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(summary = "Reject a submitted goal with a note")
    public ResponseEntity<GoalDtos.GoalResponse> rejectGoal(
            @PathVariable UUID id,
            @Valid @RequestBody GoalDtos.RejectGoalRequest request,
            @AuthenticationPrincipal AppUserPrincipal principal) {

        return ResponseEntity.ok(goalService.rejectGoal(id, request.getNote(), principal.getUserId()));
    }

    @PatchMapping("/{id}/rework")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(summary = "Return a goal for rework with a note")
    public ResponseEntity<GoalDtos.GoalResponse> returnForRework(
            @PathVariable UUID id,
            @Valid @RequestBody GoalDtos.RejectGoalRequest request,
            @AuthenticationPrincipal AppUserPrincipal principal) {

        return ResponseEntity.ok(goalService.returnForRework(id, request.getNote(), principal.getUserId()));
    }
}