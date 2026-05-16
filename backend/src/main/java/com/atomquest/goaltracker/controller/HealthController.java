package com.atomquest.goaltracker.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/health")
@Tag(name = "Health", description = "Health & readiness endpoints")
public class HealthController {

    @GetMapping
    @Operation(summary = "Health check", description = "Returns 200 OK when the service is up")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "AtomQuest Goal Tracker API",
                "timestamp", Instant.now().toString()
        ));
    }
}
