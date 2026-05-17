package com.atomquest.goaltracker.dto.user;

import com.atomquest.goaltracker.entity.UserRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

/**
 * Phase 3 — User Profile & Org Hierarchy DTOs.
 */
public class UserProfileDtos {

    // ── Outbound ─────────────────────────────────────────────────────────────

    /** Full profile view returned for /api/users/me and /api/users/{id}. */
    @Data
    public static class UserProfileResponse {
        private String id;
        private String email;
        private String name;
        private String picture;
        private String role;
        private String department;
        private boolean active;
        /** Compact view of direct manager (null for top-level users). */
        private ManagerRef manager;
        /** Direct reports — populated only for managers. */
        private List<DirectReportRef> directReports;
    }

    @Data
    public static class ManagerRef {
        private String id;
        private String name;
        private String email;
        private String department;
    }

    @Data
    public static class DirectReportRef {
        private String id;
        private String name;
        private String email;
        private String department;
        private String role;
    }

    // ── Inbound ───────────────────────────────────────────────────────────────

    /** Employee / manager updates their own editable fields. */
    @Data
    public static class UpdateProfileRequest {
        @NotBlank(message = "name is required")
        @Size(max = 255)
        private String name;

        @Size(max = 255)
        private String department;
    }

    /** Org-chart search result item. */
    @Data
    public static class OrgChartNode {
        private String id;
        private String name;
        private String email;
        private String role;
        private String department;
        private String managerId;
        private String managerName;
        private int directReportCount;
    }
}