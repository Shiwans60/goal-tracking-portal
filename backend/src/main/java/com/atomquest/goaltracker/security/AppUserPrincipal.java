package com.atomquest.goaltracker.security;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.security.Principal;

/**
 * Immutable principal stored in the SecurityContext after JWT validation.
 * All fields come directly from JWT claims — no DB round-trip per request.
 */
@Getter
@RequiredArgsConstructor
public class AppUserPrincipal implements Principal {

    private final String userId;   // UUID string from JWT subject
    private final String email;
    private final String role;     // e.g. "ROLE_ADMIN"

    @Override
    public String getName() {
        return email;
    }
}