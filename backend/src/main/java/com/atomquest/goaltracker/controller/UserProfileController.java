package com.atomquest.goaltracker.controller;

import com.atomquest.goaltracker.dto.user.UserProfileDtos;
import com.atomquest.goaltracker.security.AppUserPrincipal;
import com.atomquest.goaltracker.service.UserProfileService;
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

/**
 * Phase 3 — User Profile & Org Hierarchy endpoints.
 *
 * Exposed paths:
 *   GET  /api/users/me               → own profile (all roles)
 *   PUT  /api/users/me               → update own name/department
 *   GET  /api/users/{id}             → any user profile (manager/admin)
 *   GET  /api/users/org-chart        → flat org-chart list (manager/admin)
 *   GET  /api/users/direct-reports   → manager's direct reports
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "User Profiles", description = "Employee profile and org hierarchy endpoints")
@SecurityRequirement(name = "Bearer Auth")
public class UserProfileController {

    private final UserProfileService userProfileService;

    /* ── Own profile ──────────────────────────────────────────────────── */

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get own full profile including manager and direct reports")
    public ResponseEntity<UserProfileDtos.UserProfileResponse> getMyProfile(
            @AuthenticationPrincipal AppUserPrincipal principal) {

        return ResponseEntity.ok(userProfileService.getProfile(principal.getUserId()));
    }

    @PutMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Update own editable profile fields (name, department)")
    public ResponseEntity<UserProfileDtos.UserProfileResponse> updateMyProfile(
            @Valid @RequestBody UserProfileDtos.UpdateProfileRequest request,
            @AuthenticationPrincipal AppUserPrincipal principal) {

        return ResponseEntity.ok(
                userProfileService.updateOwnProfile(principal.getUserId(), request));
    }

    /* ── Any user (manager / admin) ───────────────────────────────────── */

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(summary = "Get a specific user's profile (manager or admin only)")
    public ResponseEntity<UserProfileDtos.UserProfileResponse> getUserProfile(
            @PathVariable String id) {

        return ResponseEntity.ok(userProfileService.getProfile(id));
    }

    /* ── Org hierarchy ────────────────────────────────────────────────── */

    @GetMapping("/org-chart")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(summary = "Flat org-chart list — all users with manager references")
    public ResponseEntity<List<UserProfileDtos.OrgChartNode>> getOrgChart() {
        return ResponseEntity.ok(userProfileService.getOrgChart());
    }

    @GetMapping("/direct-reports")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(summary = "List direct reports of the currently authenticated manager")
    public ResponseEntity<List<UserProfileDtos.DirectReportRef>> getDirectReports(
            @AuthenticationPrincipal AppUserPrincipal principal) {

        return ResponseEntity.ok(userProfileService.getDirectReports(principal.getUserId()));
    }
}