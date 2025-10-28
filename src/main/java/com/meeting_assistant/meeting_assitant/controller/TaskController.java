package com.meeting_assistant.meeting_assitant.controller;

import java.time.OffsetDateTime;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.meeting_assistant.meeting_assitant.dto.ActionItemDTO;
import com.meeting_assistant.meeting_assitant.dto.SyncStatusResponse;
import com.meeting_assistant.meeting_assitant.dto.TaskRequest;
import com.meeting_assistant.meeting_assitant.dto.TaskResponse;
import com.meeting_assistant.meeting_assitant.service.TaskService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;

@RestController
@RequestMapping("/api/tasks")
@Validated
public class TaskController {

    private static final Logger logger = LoggerFactory.getLogger(TaskController.class);

    @Autowired
    private TaskService taskService;

    /**
     * Create a new task
     * POST /api/tasks
     */
    @PostMapping
    public ResponseEntity<TaskResponse> createTask(@Valid @RequestBody TaskRequest request) {
        logger.info("Creating task: {}", request.getTitle());

        try {
            TaskResponse response = taskService.createTask(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            logger.error("Invalid request for task creation: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            logger.error("Error creating task", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get all tasks with filtering and pagination
     * GET
     * /api/tasks?userId=1&status=PENDING&fromDate=2024-01-01T00:00:00Z&toDate=2024-12-31T23:59:59Z&page=0&size=10&sortBy=createdAt
     */
    @GetMapping
    public ResponseEntity<Page<TaskResponse>> getTasks(
            @RequestParam @Min(1) Long userId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime toDate,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "10") @Min(1) int size,
            @RequestParam(defaultValue = "createdAt") String sortBy) {

        logger.info("Fetching tasks for user: {} with filters", userId);

        try {
            Page<TaskResponse> tasks = taskService.getTasks(userId, status, fromDate, toDate, page, size, sortBy);
            return ResponseEntity.ok(tasks);
        } catch (IllegalArgumentException e) {
            logger.error("Invalid request for fetching tasks: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            logger.error("Error fetching tasks", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get task by ID
     * GET /api/tasks/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<TaskResponse> getTaskById(@PathVariable @Min(1) Long id) {
        logger.info("Fetching task by ID: {}", id);

        try {
            TaskResponse task = taskService.getTaskById(id);
            return ResponseEntity.ok(task);
        } catch (IllegalArgumentException e) {
            logger.error("Task not found: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            logger.error("Error fetching task", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Update an existing task
     * PUT /api/tasks/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<TaskResponse> updateTask(@PathVariable @Min(1) Long id,
            @Valid @RequestBody TaskRequest request) {
        logger.info("Updating task: {}", id);

        try {
            TaskResponse response = taskService.updateTask(id, request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            logger.error("Invalid request for task update: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            logger.error("Error updating task", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Update task status only
     * PATCH /api/tasks/{id}/status
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<TaskResponse> updateTaskStatus(@PathVariable @Min(1) Long id,
            @RequestParam String status) {
        logger.info("Updating task status: {} to {}", id, status);

        try {
            TaskResponse response = taskService.updateTaskStatus(id, status);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            logger.error("Invalid request for task status update: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            logger.error("Error updating task status", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Delete a task
     * DELETE /api/tasks/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(@PathVariable @Min(1) Long id) {
        logger.info("Deleting task: {}", id);

        try {
            taskService.deleteTask(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            logger.error("Task not found for deletion: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            logger.error("Error deleting task", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Create task from external action item
     * POST /api/tasks/from-action-item
     */
    @PostMapping("/from-action-item")
    public ResponseEntity<TaskResponse> createTaskFromActionItem(@Valid @RequestBody ActionItemDTO actionItem) {
        logger.info("Creating task from action item: {}", actionItem.getTitle());

        try {
            TaskResponse response = taskService.createTaskFromActionItem(actionItem);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            logger.error("Invalid action item: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            logger.error("Error creating task from action item", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get sync status for user's tasks
     * GET /api/tasks/sync-status?userId=1
     */
    @GetMapping("/sync-status")
    public ResponseEntity<List<SyncStatusResponse>> getSyncStatus(@RequestParam @Min(1) Long userId) {
        logger.info("Fetching sync status for user: {}", userId);

        try {
            List<SyncStatusResponse> syncStatus = taskService.getSyncStatus(userId);
            return ResponseEntity.ok(syncStatus);
        } catch (IllegalArgumentException e) {
            logger.error("Invalid user ID: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            logger.error("Error fetching sync status", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Manually trigger sync for a specific task
     * POST /api/tasks/{id}/sync
     */
    @PostMapping("/{id}/sync")
    public ResponseEntity<Void> manualSync(@PathVariable @Min(1) Long id) {
        logger.info("Manual sync triggered for task: {}", id);

        try {
            taskService.manualSync(id);
            return ResponseEntity.accepted().build();
        } catch (IllegalArgumentException e) {
            logger.error("Task not found for sync: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            logger.error("Error triggering manual sync", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}