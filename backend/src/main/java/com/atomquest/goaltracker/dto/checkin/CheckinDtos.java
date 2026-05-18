package com.atomquest.goaltracker.dto.checkin;

import com.atomquest.goaltracker.entity.GoalProgress;
import com.atomquest.goaltracker.entity.GoalStatus;
import com.atomquest.goaltracker.entity.UomType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public class CheckinDtos {

    // ── Inbound ───────────────────────────────────────────────────────────────

    @Data
    public static class UpsertCheckinRequest {
        /** Actual achievement value */
        private BigDecimal achievement;

        /** Completion date (used for TIMELINE goals) */
        private LocalDate completionDate;

        @NotNull(message = "progress is required")
        private GoalProgress progress;
    }

    @Data
    public static class AddCommentRequest {
        @NotNull
        private String comment;
    }

    // ── Outbound ──────────────────────────────────────────────────────────────

    @Data
    public static class CheckinResponse {
        private UUID          id;
        private UUID          goalId;
        private String        goalTitle;
        private String        thrustArea;
        private String        uomType;
        private BigDecimal    target;
        private BigDecimal    weightage;
        private String        quarter;
        private BigDecimal    achievement;
        private LocalDate     completionDate;
        private GoalProgress  progress;
        private BigDecimal    progressScore;
        private OffsetDateTime checkedAt;
        private OffsetDateTime createdAt;
        private OffsetDateTime updatedAt;
    }

    @Data
    public static class CommentResponse {
        private UUID   id;
        private UUID   checkinId;
        private String authorId;
        private String authorName;
        private String comment;
        private OffsetDateTime createdAt;
    }

    /**
     * Phase 7 — GoalCheckinView.
     *
     * Represents a single row in the check-in list: the goal details plus
     * the check-in entry for the requested quarter (null fields if no check-in
     * has been logged yet).  This allows the frontend to show all approved goals
     * in one call without two separate fetches.
     */
    @Data
    public static class GoalCheckinView {
        // ── Goal fields ───────────────────────────────────────────────────────
        private UUID          goalId;
        private String        goalTitle;
        private String        thrustArea;
        private UomType       uomType;
        private BigDecimal    target;
        private LocalDate     targetDate;
        private BigDecimal    weightage;
        private GoalStatus    goalStatus;
        private boolean       goalLocked;
        private boolean       isShared;
        private String        employeeId;
        private String        employeeName;
        private UUID          cycleId;
        private String        cycleName;

        // ── Check-in fields (null when no check-in logged yet) ────────────────
        private UUID          checkinId;
        private String        quarter;
        /** true when a check-in already exists for this goal+quarter */
        private boolean       hasCheckin;
        private BigDecimal    achievement;
        private LocalDate     completionDate;
        private GoalProgress  progress;
        private BigDecimal    progressScore;
        private OffsetDateTime checkedAt;
        private OffsetDateTime checkinCreatedAt;
        private OffsetDateTime checkinUpdatedAt;
    }
}