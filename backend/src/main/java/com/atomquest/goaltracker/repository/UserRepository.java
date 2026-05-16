package com.atomquest.goaltracker.repository;

import com.atomquest.goaltracker.entity.User;
import com.atomquest.goaltracker.entity.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    List<User> findByManagerId(UUID managerId);

    List<User> findByRole(UserRole role);

    @Query("SELECT u FROM User u WHERE u.manager.id = :managerId AND u.active = true")
    List<User> findActiveReportees(UUID managerId);
}
