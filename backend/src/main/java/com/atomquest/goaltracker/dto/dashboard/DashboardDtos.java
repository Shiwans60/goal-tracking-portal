package com.atomquest.goaltracker.dto.dashboard;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * Phase 8 — Dashboard DTOs.
 */
public class DashboardDtos {

    // ── Employee Progress Summary ─────────────────────────────────────────────

    @Data
    public static class EmployeeProgressSummary {
        private String          employeeId;
        private String          cycleId;
        private int             totalApprovedGoals;
        private BigDecimal      totalWeightage;
        /** Weighted average progress score: 0–1 range (multiply by 100 for %) */
        private BigDecimal      overallProgressScore;
        private int             goalsWithCheckinQ1;
        private int             goalsWithCheckinQ2;
        private int             goalsWithCheckinQ3;
        private int             goalsWithCheckinQ4;
        private List<QuarterStats> quarterStats;
    }

    @Data
    public static class QuarterStats {
        private String     quarter;
        private int        totalGoals;
        private int        goalsCheckedIn;
        private int        goalsPending;
        /** Completion % = (goalsCheckedIn / totalGoals) × 100 */
        private BigDecimal completionPct;
        /** Weighted progress score for this quarter × 100 */
        private BigDecimal weightedProgressScore;
        private int        onTrackCount;
        private int        completedCount;
        private int        atRiskCount;
    }

    // ── Manager Team Overview ─────────────────────────────────────────────────

    @Data
    public static class TeamCompletionOverview {
        private String                  managerId;
        private String                  cycleId;
        private int                     teamSize;
        /** % of team members who have at least one Q1 check-in */
        private BigDecimal              q1CompletionRate;
        private List<MemberCompletionRow> memberRows;
    }

    @Data
    public static class MemberCompletionRow {
        private String     employeeId;
        private String     employeeName;
        private String     department;
        private int        approvedGoals;
        private int        checkinQ1;
        private int        checkinQ2;
        private int        checkinQ3;
        private int        checkinQ4;
        /** (checkinQ1 / approvedGoals) × 100 */
        private BigDecimal q1CompletionPct;
        /** Weighted progress score 0–1 */
        private BigDecimal weightedProgressScore;
    }

    // ── Admin Org-Wide Metrics ────────────────────────────────────────────────

    @Data
    public static class OrgCompletionMetrics {
        private String     cycleId;
        private int        totalEmployees;
        private int        totalGoals;
        private int        approvedGoals;
        private int        q1CheckedIn;
        private int        q2CheckedIn;
        private int        q3CheckedIn;
        private int        q4CheckedIn;
        private BigDecimal q1CompletionPct;
        private BigDecimal q2CompletionPct;
        private BigDecimal q3CompletionPct;
        private BigDecimal q4CompletionPct;
        private List<DeptCount> employeesByDepartment;
    }

    @Data
    public static class DeptCount {
        private String department;
        private int    count;
    }

    // ── Quarter-over-Quarter Trend ────────────────────────────────────────────

    @Data
    public static class QoQTrend {
        private String             employeeId;
        private String             cycleId;
        private List<QoQDataPoint> dataPoints;
    }

    @Data
    public static class QoQDataPoint {
        private String     quarter;
        /** Weighted progress score × 100 (0–100 range for charts) */
        private BigDecimal weightedScore;
        private int        checkinCount;
        private int        onTrackCount;
        private int        atRiskCount;
    }
}