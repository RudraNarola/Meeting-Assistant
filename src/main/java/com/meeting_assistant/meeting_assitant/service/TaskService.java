package com.meeting_assistant.meeting_assitant.service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.meeting_assistant.meeting_assitant.dto.ActionItemDTO;
import com.meeting_assistant.meeting_assitant.dto.SyncStatusResponse;
import com.meeting_assistant.meeting_assitant.dto.TaskRequest;
import com.meeting_assistant.meeting_assitant.dto.TaskResponse;
import com.meeting_assistant.meeting_assitant.exception.GoogleCalendarServiceException;
import com.meeting_assistant.meeting_assitant.model.Task;
import com.meeting_assistant.meeting_assitant.model.User;
import com.meeting_assistant.meeting_assitant.repository.TaskRepository;
import com.meeting_assistant.meeting_assitant.repository.UserRepository;

@Service
@Transactional
public class TaskService {

    private static final Logger logger = LoggerFactory.getLogger(TaskService.class);

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private GoogleCalendarService googleCalendarService;

    /**
     * Create a new task
     */
    public TaskResponse createTask(TaskRequest request) {
        logger.info("Creating new task: {}", request.getTitle());

        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + request.getUserId()));

        Task task = Task.builder()
                .user(user)
                .title(request.getTitle())
                .description(request.getDescription())
                .dueDate(request.getDueDate())
                .status(request.getStatus())
                .priority(request.getPriority())
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();

        Task savedTask = taskRepository.save(task);
        logger.info("Task created with ID: {}", savedTask.getId());

        // Async sync with Google Calendar
        syncTaskWithGoogleCalendarAsync(savedTask);

        return convertToResponse(savedTask);
    }

    /**
     * Get all tasks for a user with filtering and pagination
     */
    @Transactional(readOnly = true)
    public Page<TaskResponse> getTasks(Long userId, String status, OffsetDateTime fromDate,
            OffsetDateTime toDate, int page, int size, String sortBy) {
        logger.info("Fetching tasks for user: {} with filters", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        Pageable pageable = PageRequest.of(page, size, Sort.by(sortBy).descending());

        Page<Task> tasks;
        if (status != null && fromDate != null && toDate != null) {
            tasks = taskRepository.findByUserAndStatusAndDueDateBetween(user, status, fromDate, toDate, pageable);
        } else if (status != null) {
            tasks = taskRepository.findByUserAndStatus(user, status, pageable);
        } else if (fromDate != null && toDate != null) {
            tasks = taskRepository.findByUserAndDueDateBetween(user, fromDate, toDate, pageable);
        } else {
            tasks = taskRepository.findByUser(user, pageable);
        }

        return tasks.map(this::convertToResponse);
    }

    /**
     * Get task by ID
     */
    @Transactional(readOnly = true)
    public TaskResponse getTaskById(Long taskId) {
        logger.info("Fetching task by ID: {}", taskId);

        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found: " + taskId));

        return convertToResponse(task);
    }

    /**
     * Update an existing task
     */
    public TaskResponse updateTask(Long taskId, TaskRequest request) {
        logger.info("Updating task: {}", taskId);

        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found: " + taskId));

        // Update fields
        task.setTitle(request.getTitle());
        task.setDescription(request.getDescription());
        task.setDueDate(request.getDueDate());
        task.setStatus(request.getStatus());
        task.setPriority(request.getPriority());
        task.setUpdatedAt(OffsetDateTime.now());

        Task savedTask = taskRepository.save(task);
        logger.info("Task updated: {}", savedTask.getId());

        // Async sync with Google Calendar
        syncTaskWithGoogleCalendarAsync(savedTask);

        return convertToResponse(savedTask);
    }

    /**
     * Update task status only
     */
    public TaskResponse updateTaskStatus(Long taskId, String newStatus) {
        logger.info("Updating task status: {} to {}", taskId, newStatus);

        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found: " + taskId));

        task.setStatus(newStatus);
        task.setUpdatedAt(OffsetDateTime.now());

        Task savedTask = taskRepository.save(task);
        logger.info("Task status updated: {}", savedTask.getId());

        // Async sync with Google Calendar
        syncTaskWithGoogleCalendarAsync(savedTask);

        return convertToResponse(savedTask);
    }

    /**
     * Delete a task
     */
    public void deleteTask(Long taskId) {
        logger.info("Deleting task: {}", taskId);

        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found: " + taskId));

        // Delete from Google Calendar first
        try {
            if (task.getGoogleEventId() != null) {
                googleCalendarService.deleteEvent(task);
            }
        } catch (GoogleCalendarServiceException e) {
            logger.warn("Failed to delete from Google Calendar, proceeding with task deletion: {}", e.getMessage());
        }

        taskRepository.delete(task);
        logger.info("Task deleted: {}", taskId);
    }

    /**
     * Create task from external action item
     */
    public TaskResponse createTaskFromActionItem(ActionItemDTO actionItem) {
        logger.info("Creating task from action item: {}", actionItem.getTitle());

        // Find user by email/assignedTo (simplified for demo)
        User user = userRepository.findByEmail(actionItem.getAssignedTo())
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + actionItem.getAssignedTo()));

        Task task = Task.builder()
                .user(user)
                .title(actionItem.getTitle())
                .description(buildDescriptionFromActionItem(actionItem))
                .dueDate(parseDueDate(actionItem.getDueDate()))
                .status("PENDING")
                .priority(parsePriority(actionItem.getPriority()))
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();

        Task savedTask = taskRepository.save(task);
        logger.info("Task created from action item with ID: {}", savedTask.getId());

        // Async sync with Google Calendar
        syncTaskWithGoogleCalendarAsync(savedTask);

        return convertToResponse(savedTask);
    }

    /**
     * Get sync status for tasks
     */
    @Transactional(readOnly = true)
    public List<SyncStatusResponse> getSyncStatus(Long userId) {
        logger.info("Fetching sync status for user: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        List<Task> tasks = taskRepository.findByUser(user);

        return tasks.stream()
                .map(this::convertToSyncStatus)
                .collect(Collectors.toList());
    }

    /**
     * Manually trigger sync for a specific task
     */
    public void manualSync(Long taskId) {
        logger.info("Manual sync triggered for task: {}", taskId);

        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found: " + taskId));

        syncTaskWithGoogleCalendarAsync(task);
    }

    /**
     * Async method to sync task with Google Calendar
     */
    @Async
    public void syncTaskWithGoogleCalendarAsync(Task task) {
        try {
            logger.debug("Syncing task {} with Google Calendar", task.getId());

            if (task.getGoogleEventId() != null) {
                // Update existing event
                googleCalendarService.updateEvent(task);
            } else {
                // Create new event
                googleCalendarService.createEvent(task);
            }

            logger.debug("Successfully synced task {} with Google Calendar", task.getId());
        } catch (Exception e) {
            logger.error("Failed to sync task {} with Google Calendar: {}", task.getId(), e.getMessage(), e);
        }
    }

    /**
     * Convert Task entity to TaskResponse DTO
     */
    private TaskResponse convertToResponse(Task task) {
        return TaskResponse.builder()
                .id(task.getId())
                .title(task.getTitle())
                .description(task.getDescription())
                .dueDate(task.getDueDate())
                .status(task.getStatus())
                .priority(task.getPriority())
                .userId(task.getUser().getId())
                .googleEventId(task.getGoogleEventId())
                .createdAt(task.getCreatedAt())
                .updatedAt(task.getUpdatedAt())
                .build();
    }

    /**
     * Convert Task to SyncStatusResponse
     */
    private SyncStatusResponse convertToSyncStatus(Task task) {
        return SyncStatusResponse.builder()
                .taskId(task.getId())
                .googleEventId(task.getGoogleEventId())
                .syncStatus(task.getGoogleEventId() != null ? "SYNCED" : "PENDING")
                .lastSyncResult("SUCCESS") // Would be determined from sync logs in real implementation
                .lastSyncAt(task.getUpdatedAt())
                .isActive(true)
                .build();
    }

    /**
     * Build description from action item
     */
    private String buildDescriptionFromActionItem(ActionItemDTO actionItem) {
        StringBuilder description = new StringBuilder();

        if (actionItem.getDescription() != null) {
            description.append(actionItem.getDescription()).append("\n\n");
        }

        description.append("--- Action Item Details ---\n");
        description.append("Source: ").append(actionItem.getSource()).append("\n");

        if (actionItem.getExternalId() != null) {
            description.append("External ID: ").append(actionItem.getExternalId()).append("\n");
        }

        return description.toString();
    }

    /**
     * Parse due date from string
     */
    private OffsetDateTime parseDueDate(String dueDateStr) {
        if (dueDateStr == null || dueDateStr.isBlank()) {
            return null;
        }

        try {
            return OffsetDateTime.parse(dueDateStr);
        } catch (Exception e) {
            logger.warn("Failed to parse due date: {}", dueDateStr);
            return null;
        }
    }

    /**
     * Parse priority from string
     */
    private Short parsePriority(String priorityStr) {
        if (priorityStr == null)
            return 3; // Default medium priority

        return switch (priorityStr.toLowerCase()) {
            case "critical", "5" -> (short) 5;
            case "high", "4" -> (short) 4;
            case "medium", "3" -> (short) 3;
            case "low", "2" -> (short) 2;
            case "lowest", "1" -> (short) 1;
            default -> (short) 3;
        };
    }
}