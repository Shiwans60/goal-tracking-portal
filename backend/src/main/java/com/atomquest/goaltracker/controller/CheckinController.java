package com.atomquest.goaltracker.controller;

import com.atomquest.goaltracker.dto.checkin.CheckinDtos;
import com.atomquest.goaltracker.entity.Quarter;
import com.atomquest.goaltracker.security.AppUserPrincipal;
import com.atomquest.goaltracker.service.CheckinService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Phase 7 — Quarterly Check-in endpoints.
 *
 * Employee:
 *   GET  /api/checkins/goals?quarter=Q1&cycleId=xxx  → approved goals with merged check-in status
 *   GET  /api/checkins?quarter=Q1&cycleId=xxx        → existing check-in entries only
 *   PUT  /api/checkins/{goalId}/{quarter}             → upsert achievement
 *   POST /api/checkins/{checkinId}/comments           → add comment
 *   GET  /api/checkins/{checkinId}/comments           → list comments
 *
 * Manager:
 *   GET  /api/checkins/team?quarter=Q1               → team check-ins
 */
@RestController
@RequestMapping("/api/checkins")
@RequiredArgsConstructor
@Tag(name = "Check-ins", description = "Quarterly achievement tracking")
@SecurityRequirement(name = "Bearer Auth")
public class CheckinController {

    private final CheckinService checkinService;

    // ── Employee: goals with check-in status (primary view) ──────────────────

    /**
     * GET /api/checkins/goals?quarter=Q1&cycleId=xxx
     *
     * Returns ALL approved goals for the employee, each enriched with the
     * check-in entry for the requested quarter (if one already exists).
     * This is the primary data source for the check-in list page.
     */
    @GetMapping("/goals")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    @Operation(
            summary = "List approved goals with their current quarter check-in status",
            description = "Returns every APPROVED goal for the current user. Each entry includes " +
                    "the goal details and, if it exists, the check-in logged for the given quarter.")
    public ResponseEntity<List<CheckinDtos.GoalCheckinView>> getGoalsWithCheckins(
            @RequestParam(required = false) UUID cycleId,
            @RequestParam(required = false) String quarter,
            @AuthenticationPrincipal AppUserPrincipal principal) {

        Quarter q = quarter != null ? Quarter.valueOf(quarter.toUpperCase()) : Quarter.Q1;
        return ResponseEntity.ok(
                checkinService.getGoalsWithCheckins(principal.getUserId(), cycleId, q));
    }

    // ── Employee: existing check-ins only ─────────────────────────────────────

    @GetMapping
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    @Operation(summary = "List existing check-in entries for a given quarter/cycle")
    public ResponseEntity<List<CheckinDtos.CheckinResponse>> getMyCheckins(
            @RequestParam(required = false) UUID cycleId,
            @RequestParam(required = false) String quarter,
            @AuthenticationPrincipal AppUserPrincipal principal) {

        Quarter q = quarter != null ? Quarter.valueOf(quarter.toUpperCase()) : null;
        return ResponseEntity.ok(
                checkinService.getMyCheckins(principal.getUserId(), cycleId, q));
    }

    @PutMapping("/{goalId}/{quarter}")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Create or update a check-in for a goal/quarter")
    public ResponseEntity<CheckinDtos.CheckinResponse> upsertCheckin(
            @PathVariable UUID goalId,
            @PathVariable String quarter,
            @Valid @RequestBody CheckinDtos.UpsertCheckinRequest request,
            @AuthenticationPrincipal AppUserPrincipal principal) {

        return ResponseEntity.ok(
                checkinService.upsertCheckin(goalId, quarter, request, principal.getUserId()));
    }

    // ── Manager: team check-ins ───────────────────────────────────────────────

    @GetMapping("/team")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(summary = "List team check-ins for a given quarter/cycle")
    public ResponseEntity<List<CheckinDtos.CheckinResponse>> getTeamCheckins(
            @RequestParam(required = false) UUID cycleId,
            @RequestParam(required = false) String quarter,
            @AuthenticationPrincipal AppUserPrincipal principal) {

        Quarter q = quarter != null ? Quarter.valueOf(quarter.toUpperCase()) : null;
        return ResponseEntity.ok(
                checkinService.getTeamCheckins(principal.getUserId(), cycleId, q));
    }

    /**
     * GET /api/checkins/team/goals?quarter=Q1&cycleId=xxx
     * Manager view: all direct-report goals with check-in status merged.
     */
    @GetMapping("/team/goals")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(
            summary = "List team approved goals with their quarter check-in status",
            description = "Same as /goals but scoped to the manager's direct reports.")
    public ResponseEntity<List<CheckinDtos.GoalCheckinView>> getTeamGoalsWithCheckins(
            @RequestParam(required = false) UUID cycleId,
            @RequestParam(required = false) String quarter,
            @AuthenticationPrincipal AppUserPrincipal principal) {

        Quarter q = quarter != null ? Quarter.valueOf(quarter.toUpperCase()) : Quarter.Q1;
        return ResponseEntity.ok(
                checkinService.getTeamGoalsWithCheckins(principal.getUserId(), cycleId, q));
    }

    // ── Comments ──────────────────────────────────────────────────────────────

    @PostMapping("/{checkinId}/comments")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Add a check-in comment")
    public ResponseEntity<CheckinDtos.CommentResponse> addComment(
            @PathVariable UUID checkinId,
            @Valid @RequestBody CheckinDtos.AddCommentRequest request,
            @AuthenticationPrincipal AppUserPrincipal principal) {

        return ResponseEntity.ok(
                checkinService.addComment(checkinId, request, principal.getUserId()));
    }

    @GetMapping("/{checkinId}/comments")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    @Operation(summary = "List comments for a check-in")
    public ResponseEntity<List<CheckinDtos.CommentResponse>> getComments(
            @PathVariable UUID checkinId) {

        return ResponseEntity.ok(checkinService.getComments(checkinId));
    }
}