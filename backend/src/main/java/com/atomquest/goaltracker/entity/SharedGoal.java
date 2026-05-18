package com.atomquest.goaltracker.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Phase 6 — Shared Goal.
 *
 * A SharedGoal represents a departmental KPI pushed by a Manager or Admin
 * to one or more employees.
 *
 * Lifecycle:
 *  1. Manager/Admin creates a SharedGoalTemplate (parent goal with isShared=true on Goal).
 *  2. Each recipient gets a SharedGoal record linking them to the parent.
 *  3. Recipient's goal (recipientGoal) is auto-created as APPROVED + locked,
 *     with the same title/description/target/uomType from the parent.
 *  4. Recipient may only update weightage (enforced at service layer).
 *  5. When the parent goal owner logs a check-in achievement, it is NOT
 *     auto-synced here (achievement sync is done at check-in level, Phase 7).
 *     This entity tracks the linkage for display purposes.
 */
@Entity
@Table(name = "shared_goals",
        uniqueConstraints = @UniqueConstraint(columnNames = {"parent_goal_id", "recipient_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SharedGoal {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /**
     * The source / template goal created by the manager / admin.
     * isShared=true on this Goal row.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "parent_goal_id", nullable = false)
    private Goal parentGoal;

    /**
     * The employee who receives this shared goal.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    /**
     * The auto-created goal row on the recipient's goal sheet.
     * Null until the recipient's goal is provisioned.
     */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_goal_id")
    private Goal recipientGoal;

    /**
     * Weightage the recipient assigned to this goal on their sheet.
     * Defaults to the parent's weightage; recipient can change it.
     */
    @Column(nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal recipientWeightage = BigDecimal.ZERO;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_by")
    private User assignedBy;

    @CreationTimestamp
    @Column(updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    private OffsetDateTime updatedAt;
}