package com.atomquest.goaltracker.repository;

import com.atomquest.goaltracker.entity.UnlockRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface UnlockRequestRepository extends JpaRepository<UnlockRequest, UUID> {

    List<UnlockRequest> findByRequestedByIdOrderByCreatedAtDesc(UUID userId);

    List<UnlockRequest> findByStatusOrderByCreatedAtDesc(String status);

    @Query("SELECT u FROM UnlockRequest u WHERE u.goal.id = :goalId ORDER BY u.createdAt DESC")
    List<UnlockRequest> findByGoalId(@Param("goalId") UUID goalId);

    boolean existsByGoalIdAndStatusAndRequestedById(UUID goalId, String status, UUID requestedById);
}