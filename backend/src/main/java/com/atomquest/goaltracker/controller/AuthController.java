package com.atomquest.goaltracker.controller;

import com.atomquest.goaltracker.dto.auth.AuthDtos;
import com.atomquest.goaltracker.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Auth", description = "Authentication endpoints")
public class AuthController {

    private final AuthService authService;

    /**
     * Exchanges a Google ID token (from the frontend) for an AtomQuest JWT.
     * This endpoint is public (no Bearer token needed).
     */
    @PostMapping("/google")
    @Operation(summary = "Google OAuth2 login",
            description = "Verifies a Google ID token and returns an AtomQuest JWT")
    public ResponseEntity<AuthDtos.AuthResponse> googleLogin(
            @Valid @RequestBody AuthDtos.GoogleLoginRequest request) {

        AuthDtos.AuthResponse response = authService.loginWithGoogle(request.getIdToken());
        return ResponseEntity.ok(response);
    }

    /**
     * Simple liveness check for the auth subsystem (no auth needed).
     */
    @GetMapping("/ping")
    @Operation(summary = "Auth ping", description = "Returns OK if auth service is reachable")
    public ResponseEntity<String> ping() {
        return ResponseEntity.ok("ok");
    }
}