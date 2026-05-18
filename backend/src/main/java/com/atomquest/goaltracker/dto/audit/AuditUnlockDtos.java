package com.atomquest.goaltracker.dto.audit;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public class AuditUnlockDtos {

    // ── Audit ─────────────────────────────────────────────────────────────────

    @Data
    public static class AuditEntryDto {
        private UUID           id;
        private String         entityType;
        private UUID           entityId;
        private String         action;
        private String         performedById;
        private String         performedByName;
        private String         oldValue;
        private String         newValue;
        private OffsetDateTime createdAt;
    }

    @Data
    public static class AuditPageResponse {
        private List<AuditEntryDto> entries;
        private int  page;
        private int  size;
        private long totalElements;
        private int  totalPages;
    }

    // ── Unlock Requests ───────────────────────────────────────────────────────

    @Data
    public static class CreateUnlockRequestDto {
        @NotNull(message = "goalId is required")
        private UUID goalId;

        @NotBlank(message = "reason is required")
        @Size(max = 2000)
        private String reason;
    }

    @Data
    public static class ResolveUnlockRequestDto {
        @Size(max = 2000)
        private String note;
    }

    @Data
    public static class UnlockRequestDto {
        private UUID           id;
        private UUID           goalId;
        private String         goalTitle;
        private String         requestedById;
        private String         requestedByName;
        private String         reason;
        private String         status;          // PENDING | APPROVED | DENIED
        private String         resolvedById;
        private String         resolvedByName;
        private String         resolutionNote;
        private OffsetDateTime resolvedAt;
        private OffsetDateTime createdAt;
    }
}