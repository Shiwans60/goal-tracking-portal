package com.atomquest.goaltracker.dto.shared;

import com.atomquest.goaltracker.entity.UomType;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Phase 6 — Shared Goal DTOs.
 */
public class SharedGoalDtos {

    // ── Inbound ───────────────────────────────────────────────────────────────

    /**
     * Manager/Admin creates a shared goal template and immediately assigns it
     * to one or more recipients in one API call.
     */
    @Data
    public static class CreateSharedGoalRequest {

        @NotNull(message = "cycleId is required")
        private UUID cycleId;

        @NotBlank(message = "thrustArea is required")
        @Size(max = 255)
        private String thrustArea;

        @NotBlank(message = "title is required")
        @Size(max = 500)
        private String title;

        @Size(max = 4000)
        private String description;

        @NotNull(message = "uomType is required")
        private UomType uomType;

        /** Target value (not required for ZERO_BASED / TIMELINE). */
        @DecimalMin(value = "0", inclusive = true)
        private BigDecimal target;

        private LocalDate targetDate;

        /**
         * Default weightage applied to every recipient's goal sheet.
         * Minimum 10%, same BRD rules apply.
         */
        @NotNull(message = "defaultWeightage is required")
        @DecimalMin(value = "10.00", message = "Default weightage must be at least 10%")
        @DecimalMax(value = "100.00", message = "Default weightage cannot exceed 100%")
        private BigDecimal defaultWeightage;

        /**
         * UUIDs of the employees who should receive this shared goal.
         * At least one recipient is required.
         */
        @NotNull
        @Size(min = 1, message = "At least one recipient is required")
        private List<UUID> recipientIds;
    }

    /**
     * Recipient updates their own weightage on a shared goal.
     * Only weightage may be changed — all other fields are read-only.
     */
    @Data
    public static class UpdateRecipientWeightageRequest {

        @NotNull(message = "weightage is required")
        @DecimalMin(value = "10.00", message = "Weightage must be at least 10%")
        @DecimalMax(value = "100.00", message = "Weightage cannot exceed 100%")
        private BigDecimal weightage;
    }

    // ── Outbound ──────────────────────────────────────────────────────────────

    /** Full details of a shared-goal assignment. */
    @Data
    public static class SharedGoalResponse {
        private UUID           id;
        private UUID           parentGoalId;
        private String         parentGoalTitle;
        private String         thrustArea;
        private UomType        uomType;
        private BigDecimal     target;
        private LocalDate      targetDate;
        private String         recipientId;
        private String         recipientName;
        private UUID           recipientGoalId;
        private BigDecimal     recipientWeightage;
        private String         assignedById;
        private String         assignedByName;
        private String         cycleId;
        private String         cycleName;
        /** Status of the auto-created goal on the recipient's sheet. */
        private String         recipientGoalStatus;
        private boolean        recipientGoalLocked;
        private OffsetDateTime createdAt;
        private OffsetDateTime updatedAt;
    }

    /** Summary returned when a shared goal is created (includes all recipients). */
    @Data
    public static class CreateSharedGoalResponse {
        private UUID                      parentGoalId;
        private String                    parentGoalTitle;
        private int                       recipientCount;
        private List<SharedGoalResponse>  assignments;
    }
}