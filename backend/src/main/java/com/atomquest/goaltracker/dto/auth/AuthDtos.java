package com.atomquest.goaltracker.dto.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Phase 2 Auth DTOs.
 *
 * GoogleLoginRequest  → sent by Angular after Google One Tap / GIS flow.
 * AuthResponse        → returned by the backend: our JWT + user info.
 */
public class AuthDtos {

    // ── Inbound ──────────────────────────────────────────────────────────────

    @Data
    public static class GoogleLoginRequest {
        @NotBlank(message = "idToken is required")
        private String idToken;
    }

    // ── Outbound ─────────────────────────────────────────────────────────────

    @Data
    public static class AuthResponse {
        /** AtomQuest-issued JWT — store in localStorage and send as Bearer. */
        private String token;
        private UserDto user;

        @Data
        public static class UserDto {
            private String id;
            private String email;
            private String name;
            private String picture;
            /** e.g. "ROLE_EMPLOYEE", "ROLE_MANAGER", "ROLE_ADMIN" */
            private String role;
        }
    }
}