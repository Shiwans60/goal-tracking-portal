package com.atomquest.goaltracker.service;

import com.atomquest.goaltracker.dto.checkin.CheckinDtos;
import com.atomquest.goaltracker.entity.*;
import com.atomquest.goaltracker.exception.BusinessException;
import com.atomquest.goaltracker.exception.ResourceNotFoundException;
import com.atomquest.goaltracker.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CheckinService {

    private final CheckinRepository        checkinRepository;
    private final CheckinCommentRepository commentRepository;
    private final GoalRepository           goalRepository;
    private final CycleRepository          cycleRepository;
    private final UserRepository           userRepository;

    // ── Primary view: Goals merged with check-in status ──────────────────────

    /**
     * Returns ALL approved goals for the employee, each enriched with the
     * check-in entry for the requested quarter (if one already exists).
     */
    @Transactional(readOnly = true)
    public List<CheckinDtos.GoalCheckinView> getGoalsWithCheckins(
            String userId, UUID cycleId, Quarter quarter) {

        UUID uid = UUID.fromString(userId);
        UUID cid = resolveCycleId(cycleId);

        // All APPROVED goals for the employee in the cycle
        List<Goal> goals = goalRepository.findByEmployeeIdAndCycleId(uid, cid)
                .stream()
                .filter(g -> g.getStatus() == GoalStatus.APPROVED)
                .collect(Collectors.toList());

        // Build a map of goalId → existing check-in
        Map<UUID, Checkin> checkinMap = checkinRepository
                .findByEmployeeAndCycleAndQuarter(uid, cid, quarter)
                .stream()
                .collect(Collectors.toMap(c -> c.getGoal().getId(), c -> c));

        return goals.stream()
                .map(g -> toGoalCheckinView(g, checkinMap.get(g.getId()), quarter))
                .collect(Collectors.toList());
    }

    /**
     * Manager view: all direct-report approved goals with check-in status merged.
     */
    @Transactional(readOnly = true)
    public List<CheckinDtos.GoalCheckinView> getTeamGoalsWithCheckins(
            String managerId, UUID cycleId, Quarter quarter) {

        UUID mgr = UUID.fromString(managerId);
        UUID cid = resolveCycleId(cycleId);

        // All APPROVED goals for the manager's direct reports
        List<Goal> goals = goalRepository.findTeamGoalsByCycle(mgr, cid)
                .stream()
                .filter(g -> g.getStatus() == GoalStatus.APPROVED)
                .collect(Collectors.toList());

        // Collect check-ins for the quarter
        List<Checkin> teamCheckins = checkinRepository.findTeamCheckins(mgr, cid, quarter);
        Map<UUID, Checkin> checkinMap = teamCheckins.stream()
                .collect(Collectors.toMap(c -> c.getGoal().getId(), c -> c));

        return goals.stream()
                .map(g -> toGoalCheckinView(g, checkinMap.get(g.getId()), quarter))
                .collect(Collectors.toList());
    }

    // ── Legacy check-in list queries ──────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<CheckinDtos.CheckinResponse> getMyCheckins(
            String userId, UUID cycleId, Quarter quarter) {

        UUID uid = UUID.fromString(userId);

        List<Checkin> checkins;
        if (cycleId != null && quarter != null) {
            checkins = checkinRepository.findByEmployeeAndCycleAndQuarter(uid, cycleId, quarter);
        } else if (cycleId != null) {
            checkins = checkinRepository.findByEmployeeAndCycle(uid, cycleId);
        } else {
            Cycle active = cycleRepository
                    .findFirstByStatusOrderByStartDateDesc(CycleStatus.ACTIVE)
                    .orElseThrow(() -> new BusinessException("No active cycle found"));
            checkins = quarter != null
                    ? checkinRepository.findByEmployeeAndCycleAndQuarter(uid, active.getId(), quarter)
                    : checkinRepository.findByEmployeeAndCycle(uid, active.getId());
        }
        return checkins.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CheckinDtos.CheckinResponse> getTeamCheckins(
            String managerId, UUID cycleId, Quarter quarter) {

        UUID mgr = UUID.fromString(managerId);
        UUID cid = resolveCycleId(cycleId);
        Quarter q = quarter != null ? quarter : Quarter.Q1;
        return checkinRepository.findTeamCheckins(mgr, cid, q)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    // ── Commands ──────────────────────────────────────────────────────────────

    /**
     * Upsert a check-in for a goal/quarter combination.
     * Calculates the progress score using BRD formulas.
     */
    @Transactional
    public CheckinDtos.CheckinResponse upsertCheckin(
            UUID goalId, String quarter, CheckinDtos.UpsertCheckinRequest req, String userId) {

        Quarter q    = Quarter.valueOf(quarter.toUpperCase());
        Goal goal    = goalRepository.findById(goalId)
                .orElseThrow(() -> new ResourceNotFoundException("Goal", goalId));

        if (goal.getStatus() != GoalStatus.APPROVED) {
            throw new BusinessException("Check-ins can only be logged for APPROVED goals");
        }

        Cycle cycle = goal.getCycle();
        User  user  = userRepository.findById(UUID.fromString(userId))
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        // Verify ownership or manager relationship
        boolean isOwner   = goal.getEmployee().getId().toString().equals(userId);
        boolean isManager = user.getRole() == UserRole.ROLE_MANAGER
                || user.getRole() == UserRole.ROLE_ADMIN;
        if (!isOwner && !isManager) {
            throw new BusinessException("You cannot log a check-in for this goal");
        }

        Checkin checkin = checkinRepository
                .findByGoalIdAndQuarterAndCycleId(goalId, q, cycle.getId())
                .orElseGet(() -> Checkin.builder()
                        .goal(goal)
                        .quarter(q)
                        .cycle(cycle)
                        .build());

        checkin.setAchievement(req.getAchievement());
        checkin.setCompletionDate(req.getCompletionDate());
        checkin.setProgress(req.getProgress());
        checkin.setSubmittedBy(user);
        checkin.setCheckedAt(OffsetDateTime.now());

        BigDecimal score = computeScore(goal, req);
        checkin.setProgressScore(score);

        return toResponse(checkinRepository.save(checkin));
    }

    @Transactional
    public CheckinDtos.CommentResponse addComment(
            UUID checkinId, CheckinDtos.AddCommentRequest req, String userId) {

        Checkin checkin = checkinRepository.findById(checkinId)
                .orElseThrow(() -> new ResourceNotFoundException("Checkin", checkinId));
        User author = userRepository.findById(UUID.fromString(userId))
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        CheckinComment comment = CheckinComment.builder()
                .checkin(checkin)
                .author(author)
                .comment(req.getComment())
                .build();

        return toCommentResponse(commentRepository.save(comment));
    }

    @Transactional(readOnly = true)
    public List<CheckinDtos.CommentResponse> getComments(UUID checkinId) {
        return commentRepository.findByCheckinIdOrderByCreatedAtAsc(checkinId)
                .stream().map(this::toCommentResponse).collect(Collectors.toList());
    }

    // ── BRD Progress Score Formulas ───────────────────────────────────────────

    /**
     * Phase 8 — BRD §2.2 formulas.  Returns a score in [0, 1].
     *   NUMERIC_MIN / PERCENTAGE_MIN  → achievement ÷ target          (higher better)
     *   NUMERIC_MAX / PERCENTAGE_MAX  → target ÷ achievement           (lower better)
     *   TIMELINE                      → score based on completion date vs deadline
     *   ZERO_BASED                    → 1.0 if achievement == 0, else 0.0
     */
    public BigDecimal computeScore(Goal goal, CheckinDtos.UpsertCheckinRequest req) {
        if (req.getAchievement() == null && req.getCompletionDate() == null) {
            return null;
        }
        MathContext mc = new MathContext(8, RoundingMode.HALF_UP);
        BigDecimal ONE = BigDecimal.ONE;

        return switch (goal.getUomType()) {
            case NUMERIC_MIN, PERCENTAGE_MIN -> {
                if (goal.getTarget() == null || goal.getTarget().compareTo(BigDecimal.ZERO) == 0)
                    yield null;
                BigDecimal raw = req.getAchievement().divide(goal.getTarget(), mc);
                yield raw.min(ONE).max(BigDecimal.ZERO).setScale(4, RoundingMode.HALF_UP);
            }
            case NUMERIC_MAX, PERCENTAGE_MAX -> {
                if (req.getAchievement() == null
                        || req.getAchievement().compareTo(BigDecimal.ZERO) == 0)
                    yield null;
                if (goal.getTarget() == null) yield null;
                BigDecimal raw = goal.getTarget().divide(req.getAchievement(), mc);
                yield raw.min(ONE).max(BigDecimal.ZERO).setScale(4, RoundingMode.HALF_UP);
            }
            case TIMELINE -> {
                if (goal.getTargetDate() == null || req.getCompletionDate() == null) yield null;
                long targetDays     = ChronoUnit.DAYS.between(
                        goal.getCreatedAt().toLocalDate(), goal.getTargetDate());
                long completionDays = ChronoUnit.DAYS.between(
                        goal.getCreatedAt().toLocalDate(), req.getCompletionDate());
                if (targetDays <= 0) yield ONE;
                BigDecimal ratio = BigDecimal.valueOf(completionDays)
                        .divide(BigDecimal.valueOf(targetDays), mc);
                // On-time or early = 1.0; proportionally less if late
                yield ratio.compareTo(ONE) <= 0
                        ? ONE
                        : ONE.divide(ratio, mc).setScale(4, RoundingMode.HALF_UP);
            }
            case ZERO_BASED -> {
                if (req.getAchievement() == null) yield null;
                yield req.getAchievement().compareTo(BigDecimal.ZERO) == 0
                        ? ONE : BigDecimal.ZERO;
            }
        };
    }

    // ── Mappers ───────────────────────────────────────────────────────────────

    private CheckinDtos.GoalCheckinView toGoalCheckinView(Goal g, Checkin c, Quarter quarter) {
        CheckinDtos.GoalCheckinView v = new CheckinDtos.GoalCheckinView();

        // Goal fields
        v.setGoalId(g.getId());
        v.setGoalTitle(g.getTitle());
        v.setThrustArea(g.getThrustArea());
        v.setUomType(g.getUomType());
        v.setTarget(g.getTarget());
        v.setTargetDate(g.getTargetDate());
        v.setWeightage(g.getWeightage());
        v.setGoalStatus(g.getStatus());
        v.setGoalLocked(g.isLocked());
        v.setShared(g.isShared());
        v.setEmployeeId(g.getEmployee().getId().toString());
        v.setEmployeeName(g.getEmployee().getName());
        v.setCycleId(g.getCycle().getId());
        v.setCycleName(g.getCycle().getName());
        v.setQuarter(quarter.name());

        // Check-in fields
        if (c != null) {
            v.setCheckinId(c.getId());
            v.setHasCheckin(true);
            v.setAchievement(c.getAchievement());
            v.setCompletionDate(c.getCompletionDate());
            v.setProgress(c.getProgress());
            v.setProgressScore(c.getProgressScore());
            v.setCheckedAt(c.getCheckedAt());
            v.setCheckinCreatedAt(c.getCreatedAt());
            v.setCheckinUpdatedAt(c.getUpdatedAt());
        } else {
            v.setHasCheckin(false);
            v.setProgress(GoalProgress.NOT_STARTED);
        }

        return v;
    }

    private CheckinDtos.CheckinResponse toResponse(Checkin c) {
        CheckinDtos.CheckinResponse r = new CheckinDtos.CheckinResponse();
        r.setId(c.getId());
        r.setGoalId(c.getGoal().getId());
        r.setGoalTitle(c.getGoal().getTitle());
        r.setThrustArea(c.getGoal().getThrustArea());
        r.setUomType(c.getGoal().getUomType().name());
        r.setTarget(c.getGoal().getTarget());
        r.setWeightage(c.getGoal().getWeightage());
        r.setQuarter(c.getQuarter().name());
        r.setAchievement(c.getAchievement());
        r.setCompletionDate(c.getCompletionDate());
        r.setProgress(c.getProgress());
        r.setProgressScore(c.getProgressScore());
        r.setCheckedAt(c.getCheckedAt());
        r.setCreatedAt(c.getCreatedAt());
        r.setUpdatedAt(c.getUpdatedAt());
        return r;
    }

    private CheckinDtos.CommentResponse toCommentResponse(CheckinComment c) {
        CheckinDtos.CommentResponse r = new CheckinDtos.CommentResponse();
        r.setId(c.getId());
        r.setCheckinId(c.getCheckin().getId());
        r.setAuthorId(c.getAuthor().getId().toString());
        r.setAuthorName(c.getAuthor().getName());
        r.setComment(c.getComment());
        r.setCreatedAt(c.getCreatedAt());
        return r;
    }

    private UUID resolveCycleId(UUID cycleId) {
        if (cycleId != null) return cycleId;
        return cycleRepository
                .findFirstByStatusOrderByStartDateDesc(CycleStatus.ACTIVE)
                .orElseThrow(() -> new BusinessException("No active cycle"))
                .getId();
    }
}