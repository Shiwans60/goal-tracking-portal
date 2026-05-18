package com.atomquest.goaltracker.repository;

import com.atomquest.goaltracker.entity.Goal;
import com.atomquest.goaltracker.entity.GoalStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Repository
public interface GoalRepository extends JpaRepository<Goal, UUID> {

    List<Goal> findByEmployeeIdAndCycleId(UUID employeeId, UUID cycleId);

    List<Goal> findByEmployeeId(UUID employeeId);

    /**
     * Sum weightage for all non-DRAFT, non-REJECTED goals in the cycle.
     * Used to enforce total ≤ 100% on submit.
     */
    @Query("SELECT COALESCE(SUM(g.weightage), 0) FROM Goal g " +
            "WHERE g.employee.id = :employeeId " +
            "AND g.cycle.id     = :cycleId " +
            "AND g.status NOT IN ('DRAFT', 'REJECTED')")
    BigDecimal sumActiveWeightage(
            @Param("employeeId") UUID employeeId,
            @Param("cycleId")    UUID cycleId);

    /**
     * Same as above, but excludes one goal (used during submit to compute
     * the prospective total after this goal's status changes).
     */
    @Query("SELECT COALESCE(SUM(g.weightage), 0) FROM Goal g " +
            "WHERE g.employee.id = :employeeId " +
            "AND g.cycle.id     = :cycleId " +
            "AND g.id          != :excludeId " +
            "AND g.status NOT IN ('DRAFT', 'REJECTED')")
    BigDecimal sumActiveWeightageExcluding(
            @Param("employeeId") UUID employeeId,
            @Param("cycleId")    UUID cycleId,
            @Param("excludeId")  UUID excludeId);

    @Query("SELECT COALESCE(SUM(g.weightage), 0) FROM Goal g " +
            "WHERE g.employee.id = :employeeId AND g.cycle.id = :cycleId " +
            "AND g.status != 'DRAFT'")
    BigDecimal sumWeightageByEmployeeAndCycle(
            @Param("employeeId") UUID employeeId,
            @Param("cycleId")    UUID cycleId);

    @Query("SELECT COUNT(g) FROM Goal g " +
            "WHERE g.employee.id = :employeeId AND g.cycle.id = :cycleId")
    long countByEmployeeAndCycle(
            @Param("employeeId") UUID employeeId,
            @Param("cycleId")    UUID cycleId);

    /** Manager view: goals pending approval from their direct reports. */
    @Query("SELECT g FROM Goal g WHERE g.employee.manager.id = :managerId " +
            "AND g.status = :status")
    List<Goal> findByManagerIdAndStatus(
            @Param("managerId") UUID managerId,
            @Param("status")    GoalStatus status);

    /** Manager view: all team goals in a cycle. */
    @Query("SELECT g FROM Goal g WHERE g.employee.manager.id = :managerId " +
            "AND g.cycle.id = :cycleId ORDER BY g.employee.name, g.thrustArea")
    List<Goal> findTeamGoalsByCycle(
            @Param("managerId") UUID managerId,
            @Param("cycleId")   UUID cycleId);

    /** Manager view: all team goals across all cycles. */
    @Query("SELECT g FROM Goal g WHERE g.employee.manager.id = :managerId " +
            "ORDER BY g.cycle.startDate DESC, g.employee.name, g.thrustArea")
    List<Goal> findAllTeamGoals(@Param("managerId") UUID managerId);
}