package com.atomquest.goaltracker.controller;

import com.atomquest.goaltracker.dto.dashboard.DashboardDtos;
import com.atomquest.goaltracker.security.AppUserPrincipal;
import com.atomquest.goaltracker.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Phase 8 — Dashboard & Completion Metrics REST API.
 *
 * Endpoints:
 *   GET /api/dashboard/me                      → Employee progress summary
 *   GET /api/dashboard/me/trend                → Employee QoQ trend
 *   GET /api/dashboard/team                    → Manager team completion overview
 *   GET /api/dashboard/org                     → Admin org-wide completion metrics
 */
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard", description = "Progress metrics and completion dashboards")
@SecurityRequirement(name = "Bearer Auth")
public class DashboardController {

    private final DashboardService dashboardService;

    // ── Employee ─────────────────────────────────────────────────────────────

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    @Operation(
            summary = "Employee's own progress summary",
            description = "Returns weighted progress score, per-quarter completion stats, " +
                    "and check-in counts for the current user.")
    public ResponseEntity<DashboardDtos.EmployeeProgressSummary> getMyProgressSummary(
            @RequestParam(required = false) UUID cycleId,
            @AuthenticationPrincipal AppUserPrincipal principal) {

        return ResponseEntity.ok(
                dashboardService.getEmployeeProgressSummary(principal.getUserId(), cycleId));
    }

    @GetMapping("/me/trend")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    @Operation(
            summary = "Employee quarter-over-quarter trend",
            description = "Returns weighted progress scores for Q1–Q4, suitable for line/bar charts.")
    public ResponseEntity<DashboardDtos.QoQTrend> getMyQoQTrend(
            @RequestParam(required = false) UUID cycleId,
            @AuthenticationPrincipal AppUserPrincipal principal) {

        return ResponseEntity.ok(
                dashboardService.getQoQTrend(principal.getUserId(), cycleId));
    }

    // ── Manager ──────────────────────────────────────────────────────────────

    @GetMapping("/team")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(
            summary = "Manager's team completion overview",
            description = "Returns check-in completion rates and weighted progress scores " +
                    "for every direct report.")
    public ResponseEntity<DashboardDtos.TeamCompletionOverview> getTeamCompletionOverview(
            @RequestParam(required = false) UUID cycleId,
            @AuthenticationPrincipal AppUserPrincipal principal) {

        return ResponseEntity.ok(
                dashboardService.getTeamCompletionOverview(principal.getUserId(), cycleId));
    }

    // ── Admin ────────────────────────────────────────────────────────────────

    @GetMapping("/org")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
            summary = "Organisation-wide completion metrics (Admin only)",
            description = "Aggregated check-in completion percentages by quarter, " +
                    "goal approval stats, and department breakdown.")
    public ResponseEntity<DashboardDtos.OrgCompletionMetrics> getOrgCompletionMetrics(
            @RequestParam(required = false) UUID cycleId) {

        return ResponseEntity.ok(dashboardService.getOrgCompletionMetrics(cycleId));
    }
}