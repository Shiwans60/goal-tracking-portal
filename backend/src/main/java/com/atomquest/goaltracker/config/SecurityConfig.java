package com.atomquest.goaltracker.config;

import com.atomquest.goaltracker.security.JwtAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Phase 2 Security config.
 *
 * Authentication flow:
 *   1. Angular calls Google One Tap / GIS → receives Google ID token (JWT).
 *   2. Angular POSTs the ID token to /api/auth/google.
 *   3. Backend verifies it via GoogleIdTokenVerifier (google-api-client).
 *   4. Backend upserts the user in DB, issues its own short-lived JWT.
 *   5. Angular stores the JWT in localStorage and sends it as "Bearer <token>"
 *      on every subsequent API call.
 *   6. JwtAuthFilter validates the token and populates the SecurityContext.
 *
 * No Spring OAuth2 client sessions — completely stateless.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity          // enables @PreAuthorize on every controller
@RequiredArgsConstructor
public class SecurityConfig {

    private final AppProperties appProperties;
    private final JwtAuthFilter jwtAuthFilter;

    /** Paths that do NOT require a Bearer token. */
    private static final String[] PUBLIC_PATHS = {
            "/api/health",
            "/api/auth/**",          // /google + /ping
            "/swagger-ui/**",
            "/swagger-ui.html",
            "/v3/api-docs/**",
            "/actuator/health"
    };

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                // Completely stateless — Spring must not create/use HTTP sessions
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(PUBLIC_PATHS).permitAll()
                        .anyRequest().authenticated()
                )
                // JWT filter runs before Spring's default username/password filter
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // Allow configured origins (comma-separated in application.yml)
        List<String> origins = List.of(
                appProperties.getCorsAllowedOrigins().split(",")
        );
        config.setAllowedOrigins(origins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}