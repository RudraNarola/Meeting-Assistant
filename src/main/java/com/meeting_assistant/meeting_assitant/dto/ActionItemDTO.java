package com.meeting_assistant.meeting_assitant.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ActionItemDTO {

    private Long userId; // User ID for task assignment

    private String title;

    private String description;

    private String dueDate;

    private String assignedTo; // Email or name for calendar sync

    private String externalId; // ID from external service (action-item service)
}