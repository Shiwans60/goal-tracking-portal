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

    @Query("SELECT COALESCE(SUM(g.weightage), 0) FROM Goal g " +
            "WHERE g.employee.id = :employeeId AND g.cycle.id = :cycleId " +
            "AND g.status != 'DRAFT'")
    BigDecimal sumWeightageByEmployeeAndCycle(
            @Param("employeeId") UUID employeeId,
            @Param("cycleId") UUID cycleId);

    @Query("SELECT COUNT(g) FROM Goal g " +
            "WHERE g.employee.id = :employeeId AND g.cycle.id = :cycleId")
    long countByEmployeeAndCycle(
            @Param("employeeId") UUID employeeId,
            @Param("cycleId") UUID cycleId);

    /**
     * Manager view: goals for their direct reports filtered by status.
     * Only called when a specific status is needed (Phase 5 approval queue).
     */
    @Query("SELECT g FROM Goal g WHERE g.employee.manager.id = :managerId " +
            "AND g.status = :status")
    List<Goal> findByManagerIdAndStatus(
            @Param("managerId") UUID managerId,
            @Param("status") GoalStatus status);

    /**
     * Manager view: ALL goals for a team in a given cycle (no status filter).
     * Fixed: removed erroneous null parameter that caused HQL binding error.
     */
    @Query("SELECT g FROM Goal g WHERE g.employee.manager.id = :managerId " +
            "AND g.cycle.id = :cycleId ORDER BY g.employee.name, g.thrustArea")
    List<Goal> findTeamGoalsByCycle(
            @Param("managerId") UUID managerId,
            @Param("cycleId") UUID cycleId);

    /**
     * Manager view: ALL goals for a team across ALL cycles.
     */
    @Query("SELECT g FROM Goal g WHERE g.employee.manager.id = :managerId " +
            "ORDER BY g.cycle.startDate DESC, g.employee.name, g.thrustArea")
    List<Goal> findAllTeamGoals(@Param("managerId") UUID managerId);
}