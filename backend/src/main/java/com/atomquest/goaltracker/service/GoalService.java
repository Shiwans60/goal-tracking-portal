package com.atomquest.goaltracker.service;

import com.atomquest.goaltracker.dto.goal.GoalDtos;
import com.atomquest.goaltracker.entity.*;
import com.atomquest.goaltracker.exception.BusinessException;
import com.atomquest.goaltracker.exception.ResourceNotFoundException;
import com.atomquest.goaltracker.repository.CycleRepository;
import com.atomquest.goaltracker.repository.GoalRepository;
import com.atomquest.goaltracker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class GoalService {

    private final GoalRepository   goalRepository;
    private final UserRepository   userRepository;
    private final CycleRepository  cycleRepository;

    // ── Employee: own goals ──────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<GoalDtos.GoalResponse> getMyGoals(String userId, UUID cycleId) {
        List<Goal> goals = cycleId != null
                ? goalRepository.findByEmployeeIdAndCycleId(UUID.fromString(userId), cycleId)
                : goalRepository.findByEmployeeId(UUID.fromString(userId));
        return goals.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public GoalDtos.GoalResponse getGoalById(UUID goalId, String userId, String role) {
        Goal goal = findGoal(goalId);
        boolean isOwner   = goal.getEmployee().getId().toString().equals(userId);
        boolean isManager = role.contains("MANAGER") || role.contains("ADMIN");
        if (!isOwner && !isManager) {
            throw new BusinessException("You do not have access to this goal");
        }
        return toResponse(goal);
    }

    // ── Manager: team goals ──────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<GoalDtos.GoalResponse> getTeamGoals(String managerId, UUID cycleId) {
        UUID mgr = UUID.fromString(managerId);
        // Fixed: use findAllTeamGoals when no cycleId provided
        List<Goal> goals = cycleId != null
                ? goalRepository.findTeamGoalsByCycle(mgr, cycleId)
                : goalRepository.findAllTeamGoals(mgr);
        return goals.stream().map(this::toResponse).collect(Collectors.toList());
    }

    // ── Commands ─────────────────────────────────────────────────────────────

    @Transactional
    public GoalDtos.GoalResponse createGoal(GoalDtos.CreateGoalRequest req, String userId) {
        User employee = findUser(userId);
        Cycle cycle   = cycleRepository.findById(req.getCycleId())
                .orElseThrow(() -> new ResourceNotFoundException("Cycle", req.getCycleId()));

        if (cycle.getStatus() != CycleStatus.ACTIVE) {
            throw new BusinessException("Goals can only be created in an ACTIVE cycle");
        }

        long count = goalRepository.countByEmployeeAndCycle(employee.getId(), cycle.getId());
        if (count >= 8) {
            throw new BusinessException("Maximum 8 goals allowed per cycle");
        }

        Goal goal = Goal.builder()
                .employee(employee)
                .cycle(cycle)
                .thrustArea(req.getThrustArea())
                .title(req.getTitle())
                .description(req.getDescription())
                .uomType(req.getUomType())
                .target(req.getTarget())
                .targetDate(req.getTargetDate())
                .weightage(req.getWeightage())
                .status(GoalStatus.DRAFT)
                .locked(false)
                .build();

        return toResponse(goalRepository.save(goal));
    }

    @Transactional
    public GoalDtos.GoalResponse updateGoal(UUID goalId, GoalDtos.UpdateGoalRequest req, String userId) {
        Goal goal = findGoalForOwner(goalId, userId);
        if (goal.isLocked()) {
            throw new BusinessException("Goal is locked and cannot be modified");
        }
        if (goal.getStatus() != GoalStatus.DRAFT && goal.getStatus() != GoalStatus.REWORK) {
            throw new BusinessException("Only DRAFT or REWORK goals can be edited");
        }

        if (req.getThrustArea()  != null) goal.setThrustArea(req.getThrustArea());
        if (req.getTitle()       != null) goal.setTitle(req.getTitle());
        if (req.getDescription() != null) goal.setDescription(req.getDescription());
        if (req.getUomType()     != null) goal.setUomType(req.getUomType());
        if (req.getTarget()      != null) goal.setTarget(req.getTarget());
        if (req.getTargetDate()  != null) goal.setTargetDate(req.getTargetDate());
        if (req.getWeightage()   != null) goal.setWeightage(req.getWeightage());

        return toResponse(goalRepository.save(goal));
    }

    @Transactional
    public GoalDtos.GoalResponse submitGoal(UUID goalId, String userId) {
        Goal goal = findGoalForOwner(goalId, userId);
        if (goal.getStatus() != GoalStatus.DRAFT && goal.getStatus() != GoalStatus.REWORK) {
            throw new BusinessException("Only DRAFT or REWORK goals can be submitted");
        }
        if (goal.getWeightage().compareTo(BigDecimal.TEN) < 0) {
            throw new BusinessException("Each goal must have at least 10% weightage");
        }

        goal.setStatus(GoalStatus.PENDING_APPROVAL);
        goal.setSubmittedAt(OffsetDateTime.now());
        return toResponse(goalRepository.save(goal));
    }

    @Transactional
    public GoalDtos.GoalResponse approveGoal(UUID goalId, String managerId) {
        Goal goal = findGoal(goalId);
        if (goal.getStatus() != GoalStatus.PENDING_APPROVAL) {
            throw new BusinessException("Only PENDING_APPROVAL goals can be approved");
        }
        User manager = findUser(managerId);
        goal.setStatus(GoalStatus.APPROVED);
        goal.setLocked(true);
        goal.setApprovedAt(OffsetDateTime.now());
        goal.setApprovedBy(manager);
        return toResponse(goalRepository.save(goal));
    }

    @Transactional
    public GoalDtos.GoalResponse rejectGoal(UUID goalId, String note, String managerId) {
        Goal goal = findGoal(goalId);
        if (goal.getStatus() != GoalStatus.PENDING_APPROVAL) {
            throw new BusinessException("Only PENDING_APPROVAL goals can be rejected");
        }
        goal.setStatus(GoalStatus.REJECTED);
        goal.setRejectionNote(note);
        return toResponse(goalRepository.save(goal));
    }

    @Transactional
    public GoalDtos.GoalResponse returnForRework(UUID goalId, String note, String managerId) {
        Goal goal = findGoal(goalId);
        if (goal.getStatus() != GoalStatus.PENDING_APPROVAL) {
            throw new BusinessException("Only PENDING_APPROVAL goals can be returned for rework");
        }
        goal.setStatus(GoalStatus.REWORK);
        goal.setRejectionNote(note);
        return toResponse(goalRepository.save(goal));
    }

    @Transactional
    public void deleteGoal(UUID goalId, String userId) {
        Goal goal = findGoalForOwner(goalId, userId);
        if (goal.getStatus() != GoalStatus.DRAFT) {
            throw new BusinessException("Only DRAFT goals can be deleted");
        }
        goalRepository.delete(goal);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private Goal findGoal(UUID goalId) {
        return goalRepository.findById(goalId)
                .orElseThrow(() -> new ResourceNotFoundException("Goal", goalId));
    }

    private Goal findGoalForOwner(UUID goalId, String userId) {
        Goal goal = findGoal(goalId);
        if (!goal.getEmployee().getId().toString().equals(userId)) {
            throw new BusinessException("You do not own this goal");
        }
        return goal;
    }

    private User findUser(String userId) {
        return userRepository.findById(UUID.fromString(userId))
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
    }

    private GoalDtos.GoalResponse toResponse(Goal g) {
        GoalDtos.GoalResponse r = new GoalDtos.GoalResponse();
        r.setId(g.getId());
        r.setEmployeeId(g.getEmployee().getId().toString());
        r.setEmployeeName(g.getEmployee().getName());
        r.setCycleId(g.getCycle().getId());
        r.setCycleName(g.getCycle().getName());
        r.setThrustArea(g.getThrustArea());
        r.setTitle(g.getTitle());
        r.setDescription(g.getDescription());
        r.setUomType(g.getUomType());
        r.setTarget(g.getTarget());
        r.setTargetDate(g.getTargetDate());
        r.setWeightage(g.getWeightage());
        r.setStatus(g.getStatus());
        r.setLocked(g.isLocked());
        r.setShared(g.isShared());
        if (g.getParentGoal() != null) r.setParentGoalId(g.getParentGoal().getId());
        r.setRejectionNote(g.getRejectionNote());
        r.setCreatedAt(g.getCreatedAt());
        r.setUpdatedAt(g.getUpdatedAt());
        return r;
    }
}