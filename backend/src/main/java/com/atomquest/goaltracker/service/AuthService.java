package com.atomquest.goaltracker.service;

import com.atomquest.goaltracker.dto.auth.AuthDtos;
import com.atomquest.goaltracker.entity.User;
import com.atomquest.goaltracker.entity.UserRole;
import com.atomquest.goaltracker.repository.UserRepository;
import com.atomquest.goaltracker.security.GoogleTokenVerifierService;
import com.atomquest.goaltracker.security.JwtUtils;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Phase 2 AuthService.
 *
 * Responsibilities:
 *  1. Verify the Google ID token with Google's servers.
 *  2. Upsert the user (preserve existing role; default new users to EMPLOYEE).
 *  3. Issue an AtomQuest JWT and return it with the user profile.
 *
 * NOTE: Role assignment is done by admins via /api/admin/users — never
 *       auto-promoted here — so the upsert logic intentionally preserves
 *       existing roles and only defaults new accounts to ROLE_EMPLOYEE.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final GoogleTokenVerifierService googleVerifier;
    private final UserRepository userRepository;
    private final JwtUtils jwtUtils;

    @Transactional
    public AuthDtos.AuthResponse loginWithGoogle(String idTokenString) {

        // ── 1. Verify with Google ────────────────────────────────────────────
        GoogleIdToken idToken = googleVerifier.verify(idTokenString);
        if (idToken == null) {
            log.warn("Rejected invalid / expired Google ID token");
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "Invalid or expired Google ID token");
        }

        GoogleIdToken.Payload payload = idToken.getPayload();
        String email   = payload.getEmail();
        String name    = (String) payload.get("name");
        String picture = (String) payload.get("picture");

        // ── 2. Upsert user ───────────────────────────────────────────────────
        User user = userRepository.findByEmail(email)
                .map(existing -> {
                    // Update mutable fields, but PRESERVE role & department
                    existing.setName(name != null ? name : existing.getName());
                    if (picture != null) existing.setPicture(picture);
                    existing.setActive(true);
                    log.debug("Existing user login: {} [{}]", email, existing.getRole());
                    return existing;
                })
                .orElseGet(() -> {
                    User newUser = User.builder()
                            .email(email)
                            .name(name != null ? name : email)
                            .picture(picture)
                            .role(UserRole.ROLE_EMPLOYEE)   // default; admin can promote later
                            .active(true)
                            .build();
                    log.info("New user self-registered via Google OAuth2: {}", email);
                    return newUser;
                });

        user = userRepository.save(user);

        // ── 3. Issue AtomQuest JWT ───────────────────────────────────────────
        String jwt = jwtUtils.generateToken(user);

        // ── 4. Build response ────────────────────────────────────────────────
        AuthDtos.AuthResponse.UserDto userDto = new AuthDtos.AuthResponse.UserDto();
        userDto.setId(user.getId().toString());
        userDto.setEmail(user.getEmail());
        userDto.setName(user.getName());
        userDto.setPicture(user.getPicture());
        userDto.setRole(user.getRole().name());

        AuthDtos.AuthResponse response = new AuthDtos.AuthResponse();
        response.setToken(jwt);
        response.setUser(userDto);
        return response;
    }
}