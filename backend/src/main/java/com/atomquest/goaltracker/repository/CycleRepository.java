package com.atomquest.goaltracker.repository;

import com.atomquest.goaltracker.entity.Cycle;
import com.atomquest.goaltracker.entity.CycleStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CycleRepository extends JpaRepository<Cycle, UUID> {

    Optional<Cycle> findFirstByStatusOrderByStartDateDesc(CycleStatus status);

    List<Cycle> findByStatus(CycleStatus status);
}
