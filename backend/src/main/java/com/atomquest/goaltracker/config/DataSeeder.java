package com.atomquest.goaltracker.config;

import com.atomquest.goaltracker.entity.User;
import com.atomquest.goaltracker.entity.UserRole;
import com.atomquest.goaltracker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Phase 2 – Role Seeder.
 *
 * Runs once on startup to ensure the three demo accounts have the correct roles.
 * Safe to run multiple times (idempotent).  Flyway V2 already inserts the rows;
 * this runner promotes them to the right roles in case the DB was freshly migrated.
 *
 * In production, admins manage roles via /api/admin/users/{id}/role.
 *
 * Only active in "dev" and "test" profiles so production seeds are controlled
 * by Flyway scripts only.
 */
@Configuration
@RequiredArgsConstructor
@Slf4j
public class DataSeeder {

    private final UserRepository userRepository;

    @Bean
    @Profile({"dev", "test", "default"})
    ApplicationRunner seedDemoRoles() {
        return args -> {
            log.info("DataSeeder: ensuring demo user roles are correct...");
            ensureRole("admin@company.com",    UserRole.ROLE_ADMIN,    "Admin User",    "HR");
            ensureRole("manager@company.com",  UserRole.ROLE_MANAGER,  "Manager User",  "Engineering");
            ensureRole("employee@company.com", UserRole.ROLE_EMPLOYEE, "Employee User", "Engineering");
            log.info("DataSeeder: done.");
        };
    }

    @Transactional
    void ensureRole(String email, UserRole role, String name, String department) {
        userRepository.findByEmail(email).ifPresentOrElse(
                u -> {
                    if (u.getRole() != role) {
                        u.setRole(role);
                        userRepository.save(u);
                        log.info("  Updated role for {} → {}", email, role);
                    }
                },
                () -> {
                    // Flyway should have inserted the row; create it as fallback
                    User u = User.builder()
                            .id(null)               // let DB generate
                            .email(email)
                            .name(name)
                            .role(role)
                            .department(department)
                            .active(true)
                            .build();
                    userRepository.save(u);
                    log.info("  Created demo user {} with role {}", email, role);
                }
        );
    }
}