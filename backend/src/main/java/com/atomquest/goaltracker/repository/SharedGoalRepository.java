package com.atomquest.goaltracker.repository;

import com.atomquest.goaltracker.entity.SharedGoal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SharedGoalRepository extends JpaRepository<SharedGoal, UUID> {

    /** All shared-goal assignments where this goal is the parent (template). */
    List<SharedGoal> findByParentGoalId(UUID parentGoalId);

    /** All shared goals assigned to a specific recipient (employee). */
    List<SharedGoal> findByRecipientId(UUID recipientId);

    /**
     * All shared goals for a recipient within a specific cycle.
     */
    @Query("SELECT sg FROM SharedGoal sg " +
            "WHERE sg.recipient.id = :recipientId " +
            "AND sg.parentGoal.cycle.id = :cycleId")
    List<SharedGoal> findByRecipientAndCycle(
            @Param("recipientId") UUID recipientId,
            @Param("cycleId")    UUID cycleId);

    /**
     * All shared-goal assignments created by a specific manager.
     */
    @Query("SELECT sg FROM SharedGoal sg " +
            "WHERE sg.assignedBy.id = :assignedById")
    List<SharedGoal> findByAssignedById(@Param("assignedById") UUID assignedById);

    /**
     * All shared-goal assignments within a cycle (for admin/manager oversight).
     */
    @Query("SELECT sg FROM SharedGoal sg " +
            "WHERE sg.parentGoal.cycle.id = :cycleId " +
            "ORDER BY sg.parentGoal.title, sg.recipient.name")
    List<SharedGoal> findByCycleId(@Param("cycleId") UUID cycleId);

    /** Check if a specific parent-recipient pair already exists. */
    boolean existsByParentGoalIdAndRecipientId(UUID parentGoalId, UUID recipientId);

    Optional<SharedGoal> findByParentGoalIdAndRecipientId(UUID parentGoalId, UUID recipientId);
}