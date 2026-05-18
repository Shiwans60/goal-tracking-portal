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
 * Phase 4 — Quarterly Check-in endpoints.
 *
 * Employee:
 *   GET  /api/checkins?quarter=Q1&cycleId=xxx   → own check-ins
 *   PUT  /api/checkins/{goalId}/{quarter}        → upsert achievement
 *   POST /api/checkins/{checkinId}/comments      → add comment
 *   GET  /api/checkins/{checkinId}/comments      → list comments
 *
 * Manager:
 *   GET  /api/checkins/team?quarter=Q1           → team check-ins
 */
@RestController
@RequestMapping("/api/checkins")
@RequiredArgsConstructor
@Tag(name = "Check-ins", description = "Quarterly achievement tracking")
@SecurityRequirement(name = "Bearer Auth")
public class CheckinController {

    private final CheckinService checkinService;

    // ── Employee: own check-ins ───────────────────────────────────────────────

    @GetMapping
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    @Operation(summary = "List my check-ins for a given quarter/cycle")
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