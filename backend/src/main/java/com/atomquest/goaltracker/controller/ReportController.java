package com.atomquest.goaltracker.controller;

import com.atomquest.goaltracker.security.AppUserPrincipal;
import com.atomquest.goaltracker.service.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Phase 9 — Reporting & Excel Export.
 *
 * Endpoints:
 *   GET /api/reports/achievement          → Achievement report (Excel)
 *   GET /api/reports/completion           → Completion dashboard report (Excel)
 *   GET /api/reports/achievement/preview  → JSON preview for UI table
 */
@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@Tag(name = "Reports", description = "Achievement reports and Excel export")
@SecurityRequirement(name = "Bearer Auth")
public class ReportController {

    private final ReportService reportService;

    // ── Achievement Report ────────────────────────────────────────────────────

    @GetMapping("/achievement")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    @Operation(
            summary = "Download Achievement Report (Excel)",
            description = "Role-based: Admin = org-wide, Manager = team, Employee = own goals only."
    )
    public ResponseEntity<byte[]> downloadAchievementReport(
            @RequestParam(required = false) UUID cycleId,
            @RequestParam(required = false) String quarter,
            @RequestParam(required = false) UUID employeeId,
            @RequestParam(required = false) UUID managerId,
            @RequestParam(required = false) String department,
            @AuthenticationPrincipal AppUserPrincipal principal) throws IOException {

        ReportService.ReportFilter filter = ReportService.ReportFilter.builder()
                .cycleId(cycleId)
                .quarter(quarter)
                .employeeId(employeeId)
                .managerId(managerId)
                .department(department)
                .requesterId(principal.getUserId())
                .requesterRole(principal.getRole())
                .build();

        byte[] workbook = reportService.generateAchievementReport(filter);
        String filename = "achievement-report-" + LocalDate.now() + ".xlsx";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(workbook);
    }

    // ── Completion Dashboard Report ───────────────────────────────────────────

    @GetMapping("/completion")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(
            summary = "Download Completion Dashboard Report (Excel)",
            description = "Shows per-employee completion rates for Q1–Q4."
    )
    public ResponseEntity<byte[]> downloadCompletionReport(
            @RequestParam(required = false) UUID cycleId,
            @AuthenticationPrincipal AppUserPrincipal principal) throws IOException {

        ReportService.ReportFilter filter = ReportService.ReportFilter.builder()
                .cycleId(cycleId)
                .requesterId(principal.getUserId())
                .requesterRole(principal.getRole())
                .build();

        byte[] workbook = reportService.generateCompletionReport(filter);
        String filename = "completion-dashboard-" + LocalDate.now() + ".xlsx";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(workbook);
    }

    // ── JSON Preview (for UI table before download) ───────────────────────────

    @GetMapping("/achievement/preview")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    @Operation(summary = "JSON preview of achievement report data")
    public ResponseEntity<?> previewAchievementReport(
            @RequestParam(required = false) UUID cycleId,
            @RequestParam(required = false) String quarter,
            @RequestParam(required = false) UUID employeeId,
            @RequestParam(required = false) UUID managerId,
            @RequestParam(required = false) String department,
            @AuthenticationPrincipal AppUserPrincipal principal) {

        ReportService.ReportFilter filter = ReportService.ReportFilter.builder()
                .cycleId(cycleId)
                .quarter(quarter)
                .employeeId(employeeId)
                .managerId(managerId)
                .department(department)
                .requesterId(principal.getUserId())
                .requesterRole(principal.getRole())
                .build();

        return ResponseEntity.ok(reportService.getAchievementReportRows(filter));
    }
}