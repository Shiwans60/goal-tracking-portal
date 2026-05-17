package com.atomquest.goaltracker.dto.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

public class AdminDtos {

    @Data
    public static class UpdateRoleRequest {
        @NotBlank(message = "role is required")
        @Pattern(regexp = "ROLE_EMPLOYEE|ROLE_MANAGER|ROLE_ADMIN",
                message = "role must be ROLE_EMPLOYEE, ROLE_MANAGER, or ROLE_ADMIN")
        private String role;
    }

    @Data
    public static class UpdateManagerRequest {
        /** UUID string of the new manager, or null to unassign. */
        private String managerId;
    }

    @Data
    public static class UserResponse {
        private String id;
        private String email;
        private String name;
        private String role;
        private String department;
        private boolean active;
        private String managerId;
        private String managerName;
    }
}