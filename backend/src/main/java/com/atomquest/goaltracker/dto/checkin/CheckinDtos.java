package com.atomquest.goaltracker.dto.checkin;

import com.atomquest.goaltracker.entity.GoalProgress;
import jakarta.validation.constraints.DecimalMin;
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
}