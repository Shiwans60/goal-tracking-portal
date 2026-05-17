package com.atomquest.goaltracker.service;

import com.atomquest.goaltracker.dto.user.UserProfileDtos;
import com.atomquest.goaltracker.entity.User;
import com.atomquest.goaltracker.exception.BusinessException;
import com.atomquest.goaltracker.exception.ResourceNotFoundException;
import com.atomquest.goaltracker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Phase 3 — User profile & org-hierarchy operations.
 * <p>
 * Consumed by:
 *   - UserProfileController  (own-profile endpoints)
 *   - AdminController        (admin management — already exists)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserProfileService {

    private final UserRepository userRepository;

    // ── Queries ──────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public UserProfileDtos.UserProfileResponse getProfile(String userId) {
        User user = findUser(userId);
        return toFullProfile(user);
    }

    @Transactional(readOnly = true)
    public List<UserProfileDtos.OrgChartNode> getOrgChart() {
        return userRepository.findAll()
                .stream()
                .map(this::toOrgNode)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<UserProfileDtos.DirectReportRef> getDirectReports(String managerId) {
        return userRepository.findActiveReportees(UUID.fromString(managerId))
                .stream()
                .map(this::toDirectReportRef)
                .collect(Collectors.toList());
    }

    // ── Commands ─────────────────────────────────────────────────────────────

    @Transactional
    public UserProfileDtos.UserProfileResponse updateOwnProfile(
            String userId,
            UserProfileDtos.UpdateProfileRequest req) {

        User user = findUser(userId);
        if (req.getName() != null && !req.getName().isBlank()) {
            user.setName(req.getName());
        }
        if (req.getDepartment() != null) {
            user.setDepartment(req.getDepartment());
        }
        return toFullProfile(userRepository.save(user));
    }

    // ── Mappers ──────────────────────────────────────────────────────────────

    public UserProfileDtos.UserProfileResponse toFullProfile(User user) {
        UserProfileDtos.UserProfileResponse r = new UserProfileDtos.UserProfileResponse();
        r.setId(user.getId().toString());
        r.setEmail(user.getEmail());
        r.setName(user.getName());
        r.setPicture(user.getPicture());
        r.setRole(user.getRole().name());
        r.setDepartment(user.getDepartment());
        r.setActive(user.isActive());

        // Manager ref
        if (user.getManager() != null) {
            UserProfileDtos.ManagerRef mgr = new UserProfileDtos.ManagerRef();
            mgr.setId(user.getManager().getId().toString());
            mgr.setName(user.getManager().getName());
            mgr.setEmail(user.getManager().getEmail());
            mgr.setDepartment(user.getManager().getDepartment());
            r.setManager(mgr);
        }

        // Direct reports (lightweight — only for managers/admins)
        List<User> reports = userRepository.findByManagerId(user.getId());
        r.setDirectReports(reports.stream()
                .map(this::toDirectReportRef)
                .collect(Collectors.toList()));

        return r;
    }

    private UserProfileDtos.DirectReportRef toDirectReportRef(User u) {
        UserProfileDtos.DirectReportRef ref = new UserProfileDtos.DirectReportRef();
        ref.setId(u.getId().toString());
        ref.setName(u.getName());
        ref.setEmail(u.getEmail());
        ref.setDepartment(u.getDepartment());
        ref.setRole(u.getRole().name());
        return ref;
    }

    private UserProfileDtos.OrgChartNode toOrgNode(User u) {
        UserProfileDtos.OrgChartNode node = new UserProfileDtos.OrgChartNode();
        node.setId(u.getId().toString());
        node.setName(u.getName());
        node.setEmail(u.getEmail());
        node.setRole(u.getRole().name());
        node.setDepartment(u.getDepartment());
        if (u.getManager() != null) {
            node.setManagerId(u.getManager().getId().toString());
            node.setManagerName(u.getManager().getName());
        }
        node.setDirectReportCount(userRepository.findByManagerId(u.getId()).size());
        return node;
    }

    private User findUser(String userId) {
        return userRepository.findById(UUID.fromString(userId))
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
    }
}