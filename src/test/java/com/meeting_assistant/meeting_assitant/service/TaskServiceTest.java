package com.meeting_assistant.meeting_assitant.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import com.meeting_assistant.meeting_assitant.dto.TaskRequest;
import com.meeting_assistant.meeting_assitant.dto.TaskResponse;
import com.meeting_assistant.meeting_assitant.model.Task;
import com.meeting_assistant.meeting_assitant.model.User;
import com.meeting_assistant.meeting_assitant.repository.TaskRepository;
import com.meeting_assistant.meeting_assitant.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private GoogleCalendarService googleCalendarService;

    @InjectMocks
    private TaskService taskService;

    private User testUser;
    private Task testTask;
    private TaskRequest testTaskRequest;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(1L)
                .email("test@example.com")
                .fullName("Test User")
                .build();

        testTask = Task.builder()
                .id(1L)
                .user(testUser)
                .title("Test Task")
                .description("Test Description")
                .dueDate(OffsetDateTime.now().plusDays(1))
                .status("PENDING")
                .priority("HIGH")
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();

        testTaskRequest = TaskRequest.builder()
                .title("Test Task")
                .description("Test Description")
                .dueDate(OffsetDateTime.now().plusDays(1))
                .status("PENDING")
                .priority("HIGH")
                .userId(1L)
                .build();
    }

    @Test
    void createTask_Success() {
        // Given
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(taskRepository.save(any(Task.class))).thenReturn(testTask);

        // When
        TaskResponse response = taskService.createTask(testTaskRequest);

        // Then
        assertNotNull(response);
        assertEquals("Test Task", response.getTitle());
        assertEquals("Test Description", response.getDescription());
        assertEquals("PENDING", response.getStatus());
        assertEquals("HIGH", response.getPriority());
        assertEquals(1L, response.getUserId());

        verify(userRepository).findById(1L);
        verify(taskRepository).save(any(Task.class));
    }

    @Test
    void createTask_UserNotFound_ThrowsException() {
        // Given
        when(userRepository.findById(1L)).thenReturn(Optional.empty());

        // When & Then
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> taskService.createTask(testTaskRequest));

        assertTrue(exception.getMessage().contains("User not found"));
        verify(userRepository).findById(1L);
        verify(taskRepository, never()).save(any(Task.class));
    }

    @Test
    void getTasks_WithFilters_Success() {
        // Given
        OffsetDateTime fromDate = OffsetDateTime.now();
        OffsetDateTime toDate = fromDate.plusDays(7);
        Pageable pageable = PageRequest.of(0, 10);
        Page<Task> taskPage = new PageImpl<>(Arrays.asList(testTask));

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(taskRepository.findByUserAndStatusAndDueDateBetween(eq(testUser), eq("PENDING"),
                eq(fromDate), eq(toDate), any(Pageable.class))).thenReturn(taskPage);

        // When
        Page<TaskResponse> response = taskService.getTasks(1L, "PENDING", fromDate, toDate, 0, 10, "createdAt");

        // Then
        assertNotNull(response);
        assertEquals(1, response.getTotalElements());
        assertEquals("Test Task", response.getContent().get(0).getTitle());

        verify(userRepository).findById(1L);
        verify(taskRepository).findByUserAndStatusAndDueDateBetween(eq(testUser), eq("PENDING"),
                eq(fromDate), eq(toDate), any(Pageable.class));
    }

    @Test
    void getTasks_NoFilters_Success() {
        // Given
        Pageable pageable = PageRequest.of(0, 10);
        Page<Task> taskPage = new PageImpl<>(Arrays.asList(testTask));

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(taskRepository.findByUser(eq(testUser), any(Pageable.class))).thenReturn(taskPage);

        // When
        Page<TaskResponse> response = taskService.getTasks(1L, null, null, null, 0, 10, "createdAt");

        // Then
        assertNotNull(response);
        assertEquals(1, response.getTotalElements());

        verify(userRepository).findById(1L);
        verify(taskRepository).findByUser(eq(testUser), any(Pageable.class));
    }

    @Test
    void getTaskById_Success() {
        // Given
        when(taskRepository.findById(1L)).thenReturn(Optional.of(testTask));

        // When
        TaskResponse response = taskService.getTaskById(1L);

        // Then
        assertNotNull(response);
        assertEquals(1L, response.getId());
        assertEquals("Test Task", response.getTitle());

        verify(taskRepository).findById(1L);
    }

    @Test
    void getTaskById_NotFound_ThrowsException() {
        // Given
        when(taskRepository.findById(1L)).thenReturn(Optional.empty());

        // When & Then
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> taskService.getTaskById(1L));

        assertTrue(exception.getMessage().contains("Task not found"));
        verify(taskRepository).findById(1L);
    }

    @Test
    void updateTask_Success() {
        // Given
        TaskRequest updateRequest = TaskRequest.builder()
                .title("Updated Task")
                .description("Updated Description")
                .status("IN_PROGRESS")
                .priority("CRITICAL")
                .userId(1L)
                .build();

        Task updatedTask = Task.builder()
                .id(1L)
                .user(testUser)
                .title("Updated Task")
                .description("Updated Description")
                .status("IN_PROGRESS")
                .priority("CRITICAL")
                .updatedAt(OffsetDateTime.now())
                .build();

        when(taskRepository.findById(1L)).thenReturn(Optional.of(testTask));
        when(taskRepository.save(any(Task.class))).thenReturn(updatedTask);

        // When
        TaskResponse response = taskService.updateTask(1L, updateRequest);

        // Then
        assertNotNull(response);
        assertEquals("Updated Task", response.getTitle());
        assertEquals("Updated Description", response.getDescription());
        assertEquals("IN_PROGRESS", response.getStatus());
        assertEquals("CRITICAL", response.getPriority());

        verify(taskRepository).findById(1L);
        verify(taskRepository).save(any(Task.class));
    }

    @Test
    void updateTaskStatus_Success() {
        // Given
        Task updatedTask = Task.builder()
                .id(1L)
                .user(testUser)
                .title("Test Task")
                .description("Test Description")
                .status("COMPLETED")
                .priority("HIGH")
                .updatedAt(OffsetDateTime.now())
                .build();

        when(taskRepository.findById(1L)).thenReturn(Optional.of(testTask));
        when(taskRepository.save(any(Task.class))).thenReturn(updatedTask);

        // When
        TaskResponse response = taskService.updateTaskStatus(1L, "COMPLETED");

        // Then
        assertNotNull(response);
        assertEquals("COMPLETED", response.getStatus());

        verify(taskRepository).findById(1L);
        verify(taskRepository).save(any(Task.class));
    }

    @Test
    void deleteTask_Success() {
        // Given
        when(taskRepository.findById(1L)).thenReturn(Optional.of(testTask));

        // When
        assertDoesNotThrow(() -> taskService.deleteTask(1L));

        // Then
        verify(taskRepository).findById(1L);
        verify(taskRepository).delete(testTask);
    }

    @Test
    void deleteTask_NotFound_ThrowsException() {
        // Given
        when(taskRepository.findById(1L)).thenReturn(Optional.empty());

        // When & Then
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> taskService.deleteTask(1L));

        assertTrue(exception.getMessage().contains("Task not found"));
        verify(taskRepository).findById(1L);
        verify(taskRepository, never()).delete(any(Task.class));
    }

    @Test
    void getSyncStatus_Success() {
        // Given
        List<Task> tasks = Arrays.asList(testTask);

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(taskRepository.findByUser(testUser)).thenReturn(tasks);

        // When
        var syncStatus = taskService.getSyncStatus(1L);

        // Then
        assertNotNull(syncStatus);
        assertEquals(1, syncStatus.size());
        assertEquals(1L, syncStatus.get(0).getTaskId());

        verify(userRepository).findById(1L);
        verify(taskRepository).findByUser(testUser);
    }

    @Test
    void manualSync_Success() {
        // Given
        when(taskRepository.findById(1L)).thenReturn(Optional.of(testTask));

        // When
        assertDoesNotThrow(() -> taskService.manualSync(1L));

        // Then
        verify(taskRepository).findById(1L);
        // Note: The async call to GoogleCalendarService is tested separately
    }
}