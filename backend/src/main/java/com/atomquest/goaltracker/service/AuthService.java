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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final GoogleTokenVerifierService googleVerifier;
    private final UserRepository userRepository;
    private final JwtUtils jwtUtils;

    /**
     * Verifies the Google ID token, upserts the user in the DB,
     * and returns a signed JWT plus user details.
     */
    @Transactional
    public AuthDtos.AuthResponse loginWithGoogle(String idTokenString) {
        GoogleIdToken idToken = googleVerifier.verify(idTokenString);
        if (idToken == null) {
            throw new SecurityException("Invalid or expired Google ID token");
        }

        GoogleIdToken.Payload payload = idToken.getPayload();
        String email   = payload.getEmail();
        String name    = (String) payload.get("name");
        String picture = (String) payload.get("picture");

        // Upsert: preserve existing role & department
        User user = userRepository.findByEmail(email)
                .map(existing -> {
                    existing.setName(name != null ? name : existing.getName());
                    existing.setPicture(picture);
                    return existing;
                })
                .orElseGet(() -> {
                    User newUser = User.builder()
                            .email(email)
                            .name(name != null ? name : email)
                            .picture(picture)
                            .role(UserRole.ROLE_EMPLOYEE)
                            .active(true)
                            .build();
                    log.info("New user registered via Google OAuth: {}", email);
                    return newUser;
                });

        user = userRepository.save(user);

        String jwt = jwtUtils.generateToken(user);

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