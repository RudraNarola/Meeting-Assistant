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
public class TaskResponse {

    private Long id;

    private String title;

    private String description;

    private OffsetDateTime dueDate;

    private String status;

    private Short priority;

    private Long userId;

    private String googleEventId;

    private OffsetDateTime createdAt;

    private OffsetDateTime updatedAt;
}