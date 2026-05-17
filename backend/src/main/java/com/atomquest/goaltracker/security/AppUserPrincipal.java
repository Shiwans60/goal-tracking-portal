package com.atomquest.goaltracker.security;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.security.Principal;
import java.util.Collection;
import java.util.List;

/**
 * Immutable principal stored in the Spring SecurityContext after JWT validation.
 *
 * All fields are parsed directly from JWT claims — zero DB round-trips per request.
 * Implements both Principal (for legacy compat) and UserDetails (for Spring Security).
 */
@Getter
@RequiredArgsConstructor
public class AppUserPrincipal implements Principal, UserDetails {

    private final String userId;   // UUID string from JWT sub claim
    private final String email;
    private final String role;     // e.g. "ROLE_ADMIN"

    // ── Principal ────────────────────────────────────────────────────────────

    @Override
    public String getName() { return email; }

    // ── UserDetails ──────────────────────────────────────────────────────────

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority(role));
    }

    /** Not used — auth is token-based, not password-based. */
    @Override public String getPassword() { return null; }

    @Override public String getUsername() { return email; }

    @Override public boolean isAccountNonExpired()  { return true; }
    @Override public boolean isAccountNonLocked()   { return true; }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled()            { return true; }
}