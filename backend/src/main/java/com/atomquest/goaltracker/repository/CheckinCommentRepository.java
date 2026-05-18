package com.atomquest.goaltracker.repository;

import com.atomquest.goaltracker.entity.CheckinComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CheckinCommentRepository extends JpaRepository<CheckinComment, UUID> {
    List<CheckinComment> findByCheckinIdOrderByCreatedAtAsc(UUID checkinId);
}