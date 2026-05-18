package com.atomquest.goaltracker.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Immutable audit record — never updated after creation.
 * old_value / new_value stored as raw JSON strings in a JSONB column.
 */
@Entity
@Table(name = "audit_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** e.g. "Goal", "User", "Checkin" */
    @Column(nullable = false)
    private String entityType;

    @Column(nullable = false)
    private UUID entityId;

    /** e.g. "APPROVED", "REJECTED", "REWORK", "UPDATED", "DELETED" */
    @Column(nullable = false)
    private String action;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "performed_by")
    private User performedBy;

    /** JSON snapshot before the change (nullable for CREATE actions). */
    @Column(columnDefinition = "text")
    private String oldValue;

    /** JSON snapshot after the change (nullable for DELETE actions). */
    @Column(columnDefinition = "text")
    private String newValue;

    private String ipAddress;

    @CreationTimestamp
    @Column(updatable = false)
    private OffsetDateTime createdAt;
}