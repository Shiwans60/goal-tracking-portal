package com.atomquest.goaltracker.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Phase 2 JWT authentication filter.
 *
 * Reads the "Authorization: Bearer <token>" header, validates the JWT,
 * and populates the Spring SecurityContext with an AppUserPrincipal —
 * without touching the database.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtils jwtUtils;

    @Override
    protected void doFilterInternal(
            HttpServletRequest  request,
            HttpServletResponse response,
            FilterChain         filterChain)
            throws ServletException, IOException {

        String token = extractBearerToken(request);

        if (StringUtils.hasText(token)) {
            if (jwtUtils.isValid(token)) {
                try {
                    Claims claims = jwtUtils.validateAndParseClaims(token);

                    String userId = claims.getSubject();
                    String role   = claims.get("role",  String.class);
                    String email  = claims.get("email", String.class);

                    // Build principal from JWT claims — zero DB calls
                    AppUserPrincipal principal = new AppUserPrincipal(userId, email, role);

                    UsernamePasswordAuthenticationToken auth =
                            new UsernamePasswordAuthenticationToken(
                                    principal,
                                    null,
                                    List.of(new SimpleGrantedAuthority(role))
                            );
                    auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(auth);

                } catch (Exception e) {
                    log.warn("JWT principal extraction failed for request [{}]: {}",
                            request.getRequestURI(), e.getMessage());
                }
            } else {
                log.debug("Invalid JWT on request [{}]", request.getRequestURI());
            }
        }

        filterChain.doFilter(request, response);
    }

    /** Extracts the raw token string from "Authorization: Bearer <token>". */
    private String extractBearerToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (StringUtils.hasText(header) && header.startsWith("Bearer ")) {
            return header.substring(7).trim();
        }
        return null;
    }
}