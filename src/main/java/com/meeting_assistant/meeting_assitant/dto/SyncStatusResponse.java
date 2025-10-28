package com.meeting_assistant.meeting_assitant.dto;

import java.time.OffsetDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SyncStatusResponse {

    private Long taskId;

    private String googleEventId;

    private String syncStatus; // PENDING, SYNCED, FAILED

    private String lastSyncResult; // SUCCESS, FAILED

    private OffsetDateTime lastSyncAt;

    private String errorMessage;

    private Boolean isActive;
}