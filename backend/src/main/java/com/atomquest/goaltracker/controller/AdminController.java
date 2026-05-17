package com.atomquest.goaltracker.controller;

import com.atomquest.goaltracker.dto.admin.AdminDtos;
import com.atomquest.goaltracker.entity.UserRole;
import com.atomquest.goaltracker.exception.ResourceNotFoundException;
import com.atomquest.goaltracker.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin", description = "Admin-only management endpoints")
@SecurityRequirement(name = "Bearer Auth")
public class AdminController {

    private final UserRepository userRepository;

    @GetMapping("/users")
    @Operation(summary = "List all users")
    public ResponseEntity<List<AdminDtos.UserResponse>> listUsers() {
        List<AdminDtos.UserResponse> users = userRepository.findAll()
                .stream()
                .map(u -> {
                    AdminDtos.UserResponse r = new AdminDtos.UserResponse();
                    r.setId(u.getId().toString());
                    r.setEmail(u.getEmail());
                    r.setName(u.getName());
                    r.setRole(u.getRole().name());
                    r.setDepartment(u.getDepartment());
                    r.setActive(u.isActive());
                    if (u.getManager() != null) {
                        r.setManagerId(u.getManager().getId().toString());
                        r.setManagerName(u.getManager().getName());
                    }
                    return r;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(users);
    }

    @PatchMapping("/users/{id}/role")
    @Operation(summary = "Change a user's role")
    public ResponseEntity<AdminDtos.UserResponse> updateRole(
            @PathVariable UUID id,
            @Valid @RequestBody AdminDtos.UpdateRoleRequest request) {

        var user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));

        user.setRole(UserRole.valueOf(request.getRole()));
        userRepository.save(user);

        AdminDtos.UserResponse r = new AdminDtos.UserResponse();
        r.setId(user.getId().toString());
        r.setEmail(user.getEmail());
        r.setName(user.getName());
        r.setRole(user.getRole().name());
        r.setDepartment(user.getDepartment());
        r.setActive(user.isActive());
        return ResponseEntity.ok(r);
    }

    @PatchMapping("/users/{id}/manager")
    @Operation(summary = "Assign a manager to a user")
    public ResponseEntity<AdminDtos.UserResponse> updateManager(
            @PathVariable UUID id,
            @Valid @RequestBody AdminDtos.UpdateManagerRequest request) {

        var user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));

        if (request.getManagerId() != null) {
            var manager = userRepository.findById(UUID.fromString(request.getManagerId()))
                    .orElseThrow(() -> new ResourceNotFoundException("Manager", request.getManagerId()));
            user.setManager(manager);
        } else {
            user.setManager(null);
        }
        userRepository.save(user);

        AdminDtos.UserResponse r = new AdminDtos.UserResponse();
        r.setId(user.getId().toString());
        r.setEmail(user.getEmail());
        r.setName(user.getName());
        r.setRole(user.getRole().name());
        r.setDepartment(user.getDepartment());
        r.setActive(user.isActive());
        if (user.getManager() != null) {
            r.setManagerId(user.getManager().getId().toString());
            r.setManagerName(user.getManager().getName());
        }
        return ResponseEntity.ok(r);
    }

    @PatchMapping("/users/{id}/active")
    @Operation(summary = "Activate or deactivate a user")
    public ResponseEntity<Void> toggleActive(@PathVariable UUID id,
                                             @RequestParam boolean active) {
        var user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));
        user.setActive(active);
        userRepository.save(user);
        return ResponseEntity.noContent().build();
    }
}