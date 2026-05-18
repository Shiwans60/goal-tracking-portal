package com.atomquest.goaltracker.service;

import com.atomquest.goaltracker.entity.AuditLog;
import com.atomquest.goaltracker.entity.User;
import com.atomquest.goaltracker.repository.AuditLogRepository;
import com.atomquest.goaltracker.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Phase 5 — Audit Trail Service.
 *
 * Writes immutable audit_logs rows for every significant state change.
 * Methods are @Async so they never slow down the main request thread,
 * and run in a NEW transaction so a rollback of the main tx does not
 * wipe the audit record.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository     userRepository;
    private final ObjectMapper       objectMapper;

    /**
     * Record a state-change event.
     *
     * @param entityType  short class name, e.g. "Goal"
     * @param entityId    PK of the entity
     * @param action      verb, e.g. "APPROVED", "REWORK", "REJECTED", "UPDATED"
     * @param performerId UUID string of the user performing the action
     * @param oldState    snapshot before (can be null for CREATE)
     * @param newState    snapshot after  (can be null for DELETE)
     */
    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(String entityType,
                    UUID entityId,
                    String action,
                    String performerId,
                    Object oldState,
                    Object newState) {

        try {
            User performer = null;
            if (performerId != null) {
                performer = userRepository.findById(UUID.fromString(performerId)).orElse(null);
            }

            AuditLog entry = AuditLog.builder()
                    .entityType(entityType)
                    .entityId(entityId)
                    .action(action)
                    .performedBy(performer)
                    .oldValue(serialize(oldState))
                    .newValue(serialize(newState))
                    .build();

            auditLogRepository.save(entry);

        } catch (Exception e) {
            // Audit failure must NEVER break the main flow
            log.error("Failed to write audit log [{} {} {}]: {}",
                    action, entityType, entityId, e.getMessage());
        }
    }

    private String serialize(Object obj) {
        if (obj == null) return null;
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            return obj.toString();
        }
    }
}