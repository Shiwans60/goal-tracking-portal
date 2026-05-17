package com.atomquest.goaltracker.dto.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

public class AuthDtos {

    @Data
    public static class GoogleLoginRequest {
        @NotBlank(message = "idToken is required")
        private String idToken;
    }

    @Data
    public static class AuthResponse {
        private String token;
        private UserDto user;

        @Data
        public static class UserDto {
            private String id;
            private String email;
            private String name;
            private String picture;
            private String role;
        }
    }
}