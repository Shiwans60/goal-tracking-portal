package com.atomquest.goaltracker.controller;

import com.atomquest.goaltracker.entity.Cycle;
import com.atomquest.goaltracker.entity.CycleStatus;
import com.atomquest.goaltracker.exception.ResourceNotFoundException;
import com.atomquest.goaltracker.repository.CycleRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Cycle endpoints.
 *
 * NOTE: Class-level @PreAuthorize removed so that the /active and /all endpoints
 * can be accessed by EMPLOYEE and MANAGER roles (needed by the goal-creation form).
 * Admin-only operations keep method-level guards.
 */
@RestController
@RequestMapping("/api/admin/cycles")
@RequiredArgsConstructor
@Tag(name = "Admin - Cycles", description = "Cycle management")
@SecurityRequirement(name = "Bearer Auth")
public class CycleController {

    private final CycleRepository cycleRepository;

    // ── Admin only ────────────────────────────────────────────────────────────

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "List all cycles (Admin)")
    public ResponseEntity<List<CycleResponse>> listCycles() {
        List<CycleResponse> cycles = cycleRepository.findAll()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(cycles);
    }

    // ── All authenticated roles ───────────────────────────────────────────────

    /**
     * GET /api/admin/cycles/active
     * Returns the currently active cycle.
     * Accessible by all roles so the goal-creation form can pre-select the cycle.
     */
    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Get the current active cycle (all roles)")
    public ResponseEntity<CycleResponse> getActiveCycle() {
        Cycle cycle = cycleRepository
                .findFirstByStatusOrderByStartDateDesc(CycleStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("No active cycle found"));
        return ResponseEntity.ok(toResponse(cycle));
    }

    /**
     * GET /api/admin/cycles/all
     * Returns all cycles for the goal-creation form dropdown.
     * Accessible by all roles.
     */
    @GetMapping("/all")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    @Operation(summary = "List all cycles for goal creation (all roles)")
    public ResponseEntity<List<CycleResponse>> listAllCycles() {
        List<CycleResponse> cycles = cycleRepository.findAll()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(cycles);
    }

    // ── Mapper ────────────────────────────────────────────────────────────────

    private CycleResponse toResponse(Cycle c) {
        CycleResponse r = new CycleResponse();
        r.setId(c.getId().toString());
        r.setName(c.getName());
        r.setYear(c.getYear());
        r.setStartDate(c.getStartDate().toString());
        r.setEndDate(c.getEndDate().toString());
        r.setStatus(c.getStatus().name());
        return r;
    }

    @Data
    public static class CycleResponse {
        private String id;
        private String name;
        private int year;
        private String startDate;
        private String endDate;
        private String status;
    }
}