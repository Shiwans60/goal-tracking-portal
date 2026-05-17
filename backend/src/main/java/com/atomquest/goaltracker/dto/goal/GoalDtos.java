package com.atomquest.goaltracker.dto.goal;

import com.atomquest.goaltracker.entity.GoalStatus;
import com.atomquest.goaltracker.entity.UomType;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public class GoalDtos {

    @Data
    public static class CreateGoalRequest {

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

        @DecimalMin(value = "0", inclusive = true)
        private BigDecimal target;

        private LocalDate targetDate;

        @NotNull
        @DecimalMin(value = "10.00", message = "Weightage must be at least 10%")
        @DecimalMax(value = "100.00", message = "Weightage cannot exceed 100%")
        private BigDecimal weightage;
    }

    @Data
    public static class UpdateGoalRequest {
        @Size(max = 255)
        private String thrustArea;

        @Size(max = 500)
        private String title;

        @Size(max = 4000)
        private String description;

        private UomType uomType;

        @DecimalMin(value = "0", inclusive = true)
        private BigDecimal target;

        private LocalDate targetDate;

        @DecimalMin(value = "10.00", message = "Weightage must be at least 10%")
        @DecimalMax(value = "100.00", message = "Weightage cannot exceed 100%")
        private BigDecimal weightage;
    }

    @Data
    public static class RejectGoalRequest {
        @NotBlank(message = "A rejection/rework note is required")
        @Size(max = 2000)
        private String note;
    }

    @Data
    public static class GoalResponse {
        private UUID id;
        private String employeeId;
        private String employeeName;
        private UUID cycleId;
        private String cycleName;
        private String thrustArea;
        private String title;
        private String description;
        private UomType uomType;
        private BigDecimal target;
        private LocalDate targetDate;
        private BigDecimal weightage;
        private GoalStatus status;
        private boolean locked;
        private boolean shared;
        private UUID parentGoalId;
        private String rejectionNote;
        private OffsetDateTime createdAt;
        private OffsetDateTime updatedAt;
    }
}