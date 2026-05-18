package com.atomquest.goaltracker.service;

import com.atomquest.goaltracker.dto.dashboard.DashboardDtos;
import com.atomquest.goaltracker.entity.*;
import com.atomquest.goaltracker.exception.BusinessException;
import com.atomquest.goaltracker.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Phase 8 — Dashboard & Completion Metrics Service.
 *
 * Provides:
 *  - Employee progress summary: weighted score across approved goals
 *  - Manager team completion overview: per-employee completion rates
 *  - Admin org-wide completion metrics: aggregated by quarter
 *  - Quarter-over-quarter trend data for ECharts
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DashboardService {

    private final GoalRepository    goalRepository;
    private final CheckinRepository checkinRepository;
    private final CycleRepository   cycleRepository;
    private final UserRepository    userRepository;

    // ── Employee: own progress summary ───────────────────────────────────────

    /**
     * Returns the employee's weighted progress score for each quarter,
     * plus a summary of how many goals have been checked-in vs pending.
     */
    @Transactional(readOnly = true)
    public DashboardDtos.EmployeeProgressSummary getEmployeeProgressSummary(
            String userId, UUID cycleId) {

        UUID uid = UUID.fromString(userId);
        UUID cid = resolveCycleId(cycleId);

        List<Goal> approvedGoals = goalRepository.findByEmployeeIdAndCycleId(uid, cid)
                .stream()
                .filter(g -> g.getStatus() == GoalStatus.APPROVED)
                .collect(Collectors.toList());

        List<Checkin> checkins = checkinRepository.findByEmployeeAndCycle(uid, cid);

        DashboardDtos.EmployeeProgressSummary summary = new DashboardDtos.EmployeeProgressSummary();
        summary.setEmployeeId(userId);
        summary.setCycleId(cid.toString());
        summary.setTotalApprovedGoals(approvedGoals.size());

        BigDecimal totalWeightage = approvedGoals.stream()
                .map(Goal::getWeightage)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        summary.setTotalWeightage(totalWeightage);

        // Per-quarter stats
        List<DashboardDtos.QuarterStats> quarterStats = new ArrayList<>();
        for (Quarter q : Quarter.values()) {
            quarterStats.add(buildQuarterStats(approvedGoals, checkins, q));
        }
        summary.setQuarterStats(quarterStats);

        // Overall weighted score = sum(weightage * progressScore) / totalWeightage
        // Using all check-ins (latest per goal across quarters)
        Map<UUID, BigDecimal> bestScoreByGoal = new HashMap<>();
        for (Checkin c : checkins) {
            UUID gid = c.getGoal().getId();
            if (c.getProgressScore() != null) {
                bestScoreByGoal.merge(gid, c.getProgressScore(), BigDecimal::max);
            }
        }

        BigDecimal weightedScore = BigDecimal.ZERO;
        for (Goal g : approvedGoals) {
            BigDecimal score = bestScoreByGoal.getOrDefault(g.getId(), BigDecimal.ZERO);
            weightedScore = weightedScore.add(g.getWeightage().multiply(score));
        }
        if (totalWeightage.compareTo(BigDecimal.ZERO) > 0) {
            summary.setOverallProgressScore(
                    weightedScore.divide(totalWeightage, 4, RoundingMode.HALF_UP));
        } else {
            summary.setOverallProgressScore(BigDecimal.ZERO);
        }

        // Goal status breakdown
        summary.setGoalsWithCheckinQ1((int) countGoalsWithCheckin(approvedGoals, checkins, Quarter.Q1));
        summary.setGoalsWithCheckinQ2((int) countGoalsWithCheckin(approvedGoals, checkins, Quarter.Q2));
        summary.setGoalsWithCheckinQ3((int) countGoalsWithCheckin(approvedGoals, checkins, Quarter.Q3));
        summary.setGoalsWithCheckinQ4((int) countGoalsWithCheckin(approvedGoals, checkins, Quarter.Q4));

        return summary;
    }

    // ── Manager: team completion overview ────────────────────────────────────

    @Transactional(readOnly = true)
    public DashboardDtos.TeamCompletionOverview getTeamCompletionOverview(
            String managerId, UUID cycleId) {

        UUID mgr = UUID.fromString(managerId);
        UUID cid = resolveCycleId(cycleId);

        List<User> teamMembers = userRepository.findActiveReportees(mgr);

        DashboardDtos.TeamCompletionOverview overview = new DashboardDtos.TeamCompletionOverview();
        overview.setManagerId(managerId);
        overview.setCycleId(cid.toString());
        overview.setTeamSize(teamMembers.size());

        List<DashboardDtos.MemberCompletionRow> rows = new ArrayList<>();
        int totalCheckedIn = 0;

        for (User member : teamMembers) {
            DashboardDtos.MemberCompletionRow row = new DashboardDtos.MemberCompletionRow();
            row.setEmployeeId(member.getId().toString());
            row.setEmployeeName(member.getName());
            row.setDepartment(member.getDepartment());

            List<Goal> approvedGoals = goalRepository
                    .findByEmployeeIdAndCycleId(member.getId(), cid)
                    .stream()
                    .filter(g -> g.getStatus() == GoalStatus.APPROVED)
                    .collect(Collectors.toList());

            List<Checkin> checkins = checkinRepository.findByEmployeeAndCycle(member.getId(), cid);

            row.setApprovedGoals(approvedGoals.size());

            // Count check-ins per quarter
            row.setCheckinQ1((int) countGoalsWithCheckin(approvedGoals, checkins, Quarter.Q1));
            row.setCheckinQ2((int) countGoalsWithCheckin(approvedGoals, checkins, Quarter.Q2));
            row.setCheckinQ3((int) countGoalsWithCheckin(approvedGoals, checkins, Quarter.Q3));
            row.setCheckinQ4((int) countGoalsWithCheckin(approvedGoals, checkins, Quarter.Q4));

            // Q1 completion percentage (can be adapted per current quarter)
            if (approvedGoals.size() > 0) {
                BigDecimal q1Pct = BigDecimal.valueOf(row.getCheckinQ1())
                        .multiply(BigDecimal.valueOf(100))
                        .divide(BigDecimal.valueOf(approvedGoals.size()), 1, RoundingMode.HALF_UP);
                row.setQ1CompletionPct(q1Pct);
            } else {
                row.setQ1CompletionPct(BigDecimal.ZERO);
            }

            // Weighted progress score
            Map<UUID, BigDecimal> latestScoreByGoal = new HashMap<>();
            for (Checkin c : checkins) {
                UUID gid = c.getGoal().getId();
                if (c.getProgressScore() != null) {
                    latestScoreByGoal.merge(gid, c.getProgressScore(), BigDecimal::max);
                }
            }
            BigDecimal totalWt = approvedGoals.stream()
                    .map(Goal::getWeightage).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal weightedScore = BigDecimal.ZERO;
            for (Goal g : approvedGoals) {
                BigDecimal score = latestScoreByGoal.getOrDefault(g.getId(), BigDecimal.ZERO);
                weightedScore = weightedScore.add(g.getWeightage().multiply(score));
            }
            if (totalWt.compareTo(BigDecimal.ZERO) > 0) {
                row.setWeightedProgressScore(
                        weightedScore.divide(totalWt, 4, RoundingMode.HALF_UP));
            } else {
                row.setWeightedProgressScore(BigDecimal.ZERO);
            }

            rows.add(row);
            if (row.getCheckinQ1() > 0) totalCheckedIn++;
        }

        overview.setMemberRows(rows);

        // Overall team check-in completion rate (based on Q1 for now)
        if (!teamMembers.isEmpty()) {
            overview.setQ1CompletionRate(
                    BigDecimal.valueOf(totalCheckedIn * 100L)
                            .divide(BigDecimal.valueOf(teamMembers.size()), 1, RoundingMode.HALF_UP));
        } else {
            overview.setQ1CompletionRate(BigDecimal.ZERO);
        }

        return overview;
    }

    // ── Admin: org-wide completion metrics ───────────────────────────────────

    @Transactional(readOnly = true)
    public DashboardDtos.OrgCompletionMetrics getOrgCompletionMetrics(UUID cycleId) {
        UUID cid = resolveCycleId(cycleId);

        List<User> allEmployees = userRepository.findAll().stream()
                .filter(u -> u.getRole() == UserRole.ROLE_EMPLOYEE && u.isActive())
                .collect(Collectors.toList());

        DashboardDtos.OrgCompletionMetrics metrics = new DashboardDtos.OrgCompletionMetrics();
        metrics.setCycleId(cid.toString());
        metrics.setTotalEmployees(allEmployees.size());

        // Per-quarter completion
        Map<Quarter, Integer> checkedInByQuarter = new EnumMap<>(Quarter.class);
        for (Quarter q : Quarter.values()) {
            int count = 0;
            for (User emp : allEmployees) {
                List<Goal> approved = goalRepository.findByEmployeeIdAndCycleId(emp.getId(), cid)
                        .stream().filter(g -> g.getStatus() == GoalStatus.APPROVED)
                        .collect(Collectors.toList());
                if (approved.isEmpty()) continue;
                List<Checkin> checkins = checkinRepository.findByEmployeeAndCycleAndQuarter(
                        emp.getId(), cid, q);
                if (!checkins.isEmpty()) count++;
            }
            checkedInByQuarter.put(q, count);
        }

        metrics.setQ1CheckedIn(checkedInByQuarter.getOrDefault(Quarter.Q1, 0));
        metrics.setQ2CheckedIn(checkedInByQuarter.getOrDefault(Quarter.Q2, 0));
        metrics.setQ3CheckedIn(checkedInByQuarter.getOrDefault(Quarter.Q3, 0));
        metrics.setQ4CheckedIn(checkedInByQuarter.getOrDefault(Quarter.Q4, 0));

        // Completion % per quarter
        if (allEmployees.size() > 0) {
            metrics.setQ1CompletionPct(pct(metrics.getQ1CheckedIn(), allEmployees.size()));
            metrics.setQ2CompletionPct(pct(metrics.getQ2CheckedIn(), allEmployees.size()));
            metrics.setQ3CompletionPct(pct(metrics.getQ3CheckedIn(), allEmployees.size()));
            metrics.setQ4CompletionPct(pct(metrics.getQ4CheckedIn(), allEmployees.size()));
        }

        // Goals approved vs total submitted
        long totalGoals    = goalRepository.count();
        long approvedGoals = goalRepository.findAll().stream()
                .filter(g -> g.getStatus() == GoalStatus.APPROVED).count();
        metrics.setTotalGoals((int) totalGoals);
        metrics.setApprovedGoals((int) approvedGoals);

        // Department breakdown
        Map<String, Long> byDept = allEmployees.stream()
                .filter(u -> u.getDepartment() != null)
                .collect(Collectors.groupingBy(User::getDepartment, Collectors.counting()));
        metrics.setEmployeesByDepartment(byDept.entrySet().stream()
                .map(e -> {
                    DashboardDtos.DeptCount dc = new DashboardDtos.DeptCount();
                    dc.setDepartment(e.getKey());
                    dc.setCount(e.getValue().intValue());
                    return dc;
                })
                .collect(Collectors.toList()));

        return metrics;
    }

    // ── Quarter-over-Quarter trends ───────────────────────────────────────────

    @Transactional(readOnly = true)
    public DashboardDtos.QoQTrend getQoQTrend(String userId, UUID cycleId) {
        UUID uid = UUID.fromString(userId);
        UUID cid = resolveCycleId(cycleId);

        List<Goal> approvedGoals = goalRepository.findByEmployeeIdAndCycleId(uid, cid)
                .stream()
                .filter(g -> g.getStatus() == GoalStatus.APPROVED)
                .collect(Collectors.toList());

        List<Checkin> allCheckins = checkinRepository.findByEmployeeAndCycle(uid, cid);

        DashboardDtos.QoQTrend trend = new DashboardDtos.QoQTrend();
        trend.setEmployeeId(userId);
        trend.setCycleId(cid.toString());

        List<DashboardDtos.QoQDataPoint> points = new ArrayList<>();
        for (Quarter q : Quarter.values()) {
            DashboardDtos.QoQDataPoint dp = new DashboardDtos.QoQDataPoint();
            dp.setQuarter(q.name());

            List<Checkin> quarterCheckins = allCheckins.stream()
                    .filter(c -> c.getQuarter() == q)
                    .collect(Collectors.toList());

            // Weighted score for this quarter
            BigDecimal totalWt = approvedGoals.stream()
                    .map(Goal::getWeightage).reduce(BigDecimal.ZERO, BigDecimal::add);

            Map<UUID, BigDecimal> scoreByGoal = quarterCheckins.stream()
                    .filter(c -> c.getProgressScore() != null)
                    .collect(Collectors.toMap(
                            c -> c.getGoal().getId(),
                            Checkin::getProgressScore,
                            BigDecimal::max));

            BigDecimal weightedScore = BigDecimal.ZERO;
            for (Goal g : approvedGoals) {
                BigDecimal s = scoreByGoal.getOrDefault(g.getId(), BigDecimal.ZERO);
                weightedScore = weightedScore.add(g.getWeightage().multiply(s));
            }

            if (totalWt.compareTo(BigDecimal.ZERO) > 0) {
                dp.setWeightedScore(weightedScore.divide(totalWt, 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP));
            } else {
                dp.setWeightedScore(BigDecimal.ZERO);
            }

            dp.setCheckinCount(quarterCheckins.size());
            dp.setOnTrackCount((int) quarterCheckins.stream()
                    .filter(c -> c.getProgress() == GoalProgress.ON_TRACK
                            || c.getProgress() == GoalProgress.COMPLETED).count());
            dp.setAtRiskCount((int) quarterCheckins.stream()
                    .filter(c -> c.getProgress() == GoalProgress.AT_RISK).count());

            points.add(dp);
        }
        trend.setDataPoints(points);
        return trend;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private DashboardDtos.QuarterStats buildQuarterStats(
            List<Goal> goals, List<Checkin> allCheckins, Quarter quarter) {

        DashboardDtos.QuarterStats qs = new DashboardDtos.QuarterStats();
        qs.setQuarter(quarter.name());

        List<Checkin> qCheckins = allCheckins.stream()
                .filter(c -> c.getQuarter() == quarter)
                .collect(Collectors.toList());

        Set<UUID> checkedGoalIds = qCheckins.stream()
                .map(c -> c.getGoal().getId()).collect(Collectors.toSet());

        qs.setTotalGoals(goals.size());
        qs.setGoalsCheckedIn(checkedGoalIds.size());
        qs.setGoalsPending(goals.size() - checkedGoalIds.size());

        if (goals.size() > 0) {
            qs.setCompletionPct(pct(checkedGoalIds.size(), goals.size()));
        } else {
            qs.setCompletionPct(BigDecimal.ZERO);
        }

        // Weighted progress score for this quarter
        BigDecimal totalWt = goals.stream()
                .map(Goal::getWeightage).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal weightedScore = BigDecimal.ZERO;

        Map<UUID, BigDecimal> scoreByGoal = qCheckins.stream()
                .filter(c -> c.getProgressScore() != null)
                .collect(Collectors.toMap(
                        c -> c.getGoal().getId(),
                        Checkin::getProgressScore,
                        BigDecimal::max));

        for (Goal g : goals) {
            BigDecimal s = scoreByGoal.getOrDefault(g.getId(), BigDecimal.ZERO);
            weightedScore = weightedScore.add(g.getWeightage().multiply(s));
        }

        if (totalWt.compareTo(BigDecimal.ZERO) > 0) {
            qs.setWeightedProgressScore(
                    weightedScore.divide(totalWt, 4, RoundingMode.HALF_UP)
                            .multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP));
        } else {
            qs.setWeightedProgressScore(BigDecimal.ZERO);
        }

        qs.setOnTrackCount((int) qCheckins.stream()
                .filter(c -> c.getProgress() == GoalProgress.ON_TRACK).count());
        qs.setCompletedCount((int) qCheckins.stream()
                .filter(c -> c.getProgress() == GoalProgress.COMPLETED).count());
        qs.setAtRiskCount((int) qCheckins.stream()
                .filter(c -> c.getProgress() == GoalProgress.AT_RISK).count());

        return qs;
    }

    private long countGoalsWithCheckin(
            List<Goal> goals, List<Checkin> checkins, Quarter quarter) {
        Set<UUID> checkedGoalIds = checkins.stream()
                .filter(c -> c.getQuarter() == quarter)
                .map(c -> c.getGoal().getId())
                .collect(Collectors.toSet());
        return goals.stream()
                .filter(g -> checkedGoalIds.contains(g.getId()))
                .count();
    }

    private BigDecimal pct(int numerator, int denominator) {
        if (denominator == 0) return BigDecimal.ZERO;
        return BigDecimal.valueOf(numerator * 100L)
                .divide(BigDecimal.valueOf(denominator), 1, RoundingMode.HALF_UP);
    }

    private UUID resolveCycleId(UUID cycleId) {
        if (cycleId != null) return cycleId;
        return cycleRepository
                .findFirstByStatusOrderByStartDateDesc(CycleStatus.ACTIVE)
                .orElseThrow(() -> new BusinessException("No active cycle"))
                .getId();
    }
}