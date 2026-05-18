package com.atomquest.goaltracker.repository;

import com.atomquest.goaltracker.entity.Checkin;
import com.atomquest.goaltracker.entity.Quarter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CheckinRepository extends JpaRepository<Checkin, UUID> {

    Optional<Checkin> findByGoalIdAndQuarterAndCycleId(
            UUID goalId, Quarter quarter, UUID cycleId);

    List<Checkin> findByGoalId(UUID goalId);

    @Query("SELECT c FROM Checkin c WHERE c.goal.employee.id = :employeeId " +
            "AND c.cycle.id = :cycleId AND c.quarter = :quarter")
    List<Checkin> findByEmployeeAndCycleAndQuarter(
            @Param("employeeId") UUID employeeId,
            @Param("cycleId")    UUID cycleId,
            @Param("quarter")    Quarter quarter);

    @Query("SELECT c FROM Checkin c WHERE c.goal.employee.id = :employeeId " +
            "AND c.cycle.id = :cycleId")
    List<Checkin> findByEmployeeAndCycle(
            @Param("employeeId") UUID employeeId,
            @Param("cycleId")    UUID cycleId);

    @Query("SELECT c FROM Checkin c WHERE c.goal.employee.manager.id = :managerId " +
            "AND c.cycle.id = :cycleId AND c.quarter = :quarter")
    List<Checkin> findTeamCheckins(
            @Param("managerId") UUID managerId,
            @Param("cycleId")   UUID cycleId,
            @Param("quarter")   Quarter quarter);
}