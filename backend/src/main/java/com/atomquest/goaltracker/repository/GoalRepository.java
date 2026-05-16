package com.atomquest.goaltracker.repository;

import com.atomquest.goaltracker.entity.Goal;
import com.atomquest.goaltracker.entity.GoalStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
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
    BigDecimal sumWeightageByEmployeeAndCycle(UUID employeeId, UUID cycleId);

    @Query("SELECT COUNT(g) FROM Goal g " +
           "WHERE g.employee.id = :employeeId AND g.cycle.id = :cycleId")
    long countByEmployeeAndCycle(UUID employeeId, UUID cycleId);

    @Query("SELECT g FROM Goal g WHERE g.employee.manager.id = :managerId " +
           "AND g.status = :status")
    List<Goal> findByManagerIdAndStatus(UUID managerId, GoalStatus status);

    @Query("SELECT g FROM Goal g WHERE g.employee.manager.id = :managerId " +
           "AND g.cycle.id = :cycleId")
    List<Goal> findTeamGoalsByCycle(UUID managerId, UUID cycleId);
}
