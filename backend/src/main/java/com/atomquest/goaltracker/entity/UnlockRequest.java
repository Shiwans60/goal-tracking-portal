package com.atomquest.goaltracker.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Phase 10 — Goal Unlock Request.
 *
 * Employees submit unlock requests for APPROVED (locked) goals.
 * Admins approve or deny the request.
 */
@Entity
@Table(name = "unlock_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UnlockRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "goal_id", nullable = false)
    private Goal goal;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "requested_by", nullable = false)
    private User requestedBy;

    @Column(columnDefinition = "text", nullable = false)
    private String reason;

    /**
     * PENDING | APPROVED | DENIED
     */
    @Column(nullable = false)
    @Builder.Default
    private String status = "PENDING";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resolved_by")
    private User resolvedBy;

    private OffsetDateTime resolvedAt;

    /** Admin's note when approving/denying */
    @Column(columnDefinition = "text")
    private String resolutionNote;

    @CreationTimestamp
    @Column(updatable = false)
    private OffsetDateTime createdAt;
}