package com.atomquest.goaltracker.controller;

import com.atomquest.goaltracker.dto.auth.AuthDtos;
import com.atomquest.goaltracker.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.atomquest.goaltracker.security.AppUserPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Auth", description = "Authentication endpoints")
public class AuthController {

    private final AuthService authService;

    /**
     * Exchanges a Google ID token (from the frontend One Tap / redirect flow)
     * for an AtomQuest JWT. Public — no Bearer token required.
     */
    @PostMapping("/google")
    @Operation(
            summary = "Google OAuth2 login",
            description = "Verifies a Google ID token and returns an AtomQuest JWT + user info"
    )
    public ResponseEntity<AuthDtos.AuthResponse> googleLogin(
            @Valid @RequestBody AuthDtos.GoogleLoginRequest request) {

        AuthDtos.AuthResponse response = authService.loginWithGoogle(request.getIdToken());
        return ResponseEntity.ok(response);
    }

    /**
     * Returns the currently authenticated user's profile (no DB hit —
     * data comes straight from the JWT claims stored in AppUserPrincipal).
     */
    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Current user profile", description = "Returns profile from JWT claims")
    public ResponseEntity<AuthDtos.AuthResponse.UserDto> me(
            @AuthenticationPrincipal AppUserPrincipal principal) {

        AuthDtos.AuthResponse.UserDto dto = new AuthDtos.AuthResponse.UserDto();
        dto.setId(principal.getUserId());
        dto.setEmail(principal.getEmail());
        dto.setRole(principal.getRole());
        return ResponseEntity.ok(dto);
    }

    /** Simple liveness check — no auth needed. */
    @GetMapping("/ping")
    @Operation(summary = "Auth ping")
    public ResponseEntity<String> ping() {
        return ResponseEntity.ok("ok");
    }
}