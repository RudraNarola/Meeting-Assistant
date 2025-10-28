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

    private String title;

    private String description;

    private String priority;

    private String dueDate;

    private String assignedTo;

    private String source; // e.g., "meeting-minutes", "action-items-service"

    private String externalId; // ID from external service
}