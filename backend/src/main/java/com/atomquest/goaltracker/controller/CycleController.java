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

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/cycles")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin - Cycles", description = "Cycle management (Admin only)")
@SecurityRequirement(name = "Bearer Auth")
public class CycleController {

    private final CycleRepository cycleRepository;

    @GetMapping
    @Operation(summary = "List all cycles")
    public ResponseEntity<List<CycleResponse>> listCycles() {
        List<CycleResponse> cycles = cycleRepository.findAll()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(cycles);
    }

    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('EMPLOYEE','MANAGER','ADMIN')")
    @Operation(summary = "Get the current active cycle")
    public ResponseEntity<CycleResponse> getActiveCycle() {
        Cycle cycle = cycleRepository
                .findFirstByStatusOrderByStartDateDesc(CycleStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("No active cycle found"));
        return ResponseEntity.ok(toResponse(cycle));
    }

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