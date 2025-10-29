package com.meeting_assistant.meeting_assitant;

import com.meeting_assistant.meeting_assitant.dto.TaskRequest;
import com.meeting_assistant.meeting_assitant.dto.TaskResponse;
import com.meeting_assistant.meeting_assitant.model.User;
import com.meeting_assistant.meeting_assitant.repository.UserRepository;
import com.meeting_assistant.meeting_assitant.service.TaskService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@TestPropertySource(locations = "classpath:application-test.properties")
@Transactional
public class TaskIntegrationTest {

    @Autowired
    private TaskService taskService;

    @Autowired
    private UserRepository userRepository;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .email("test@example.com")
                .username("testuser")
                .fullName("Test User")
                .build();
        testUser = userRepository.save(testUser);
    }

    @Test
    void shouldCreateTaskSuccessfully() {
        TaskRequest request = TaskRequest.builder()
                .title("Integration Test Task")
                .description("Test task creation through API")
                .status("PENDING")
                .priority("HIGH")
                .userId(testUser.getId())
                .build();

        TaskResponse response = taskService.createTask(request);

        assertNotNull(response);
        assertEquals("Integration Test Task", response.getTitle());
        assertEquals("Test task creation through API", response.getDescription());
        assertEquals("PENDING", response.getStatus());
        assertEquals("HIGH", response.getPriority());
        assertNotNull(response.getId());
    }

    @Test
    void shouldGetTasksForUser() {
        // First create a task
        TaskRequest request = TaskRequest.builder()
                .title("Test Task")
                .description("Test description")
                .status("PENDING")
                .priority("MEDIUM")
                .userId(testUser.getId())
                .build();

        taskService.createTask(request);

        // Then get all tasks for the user - use correct method signature
        Page<TaskResponse> tasks = taskService.getTasks(testUser.getId(), null, null, null, 0, 10, "id");

        assertNotNull(tasks);
        assertFalse(tasks.getContent().isEmpty());
        assertEquals("Test Task", tasks.getContent().get(0).getTitle());
    }

    @Test
    void shouldThrowExceptionForInvalidUser() {
        TaskRequest request = TaskRequest.builder()
                .title("Test Task")
                .description("Test description")
                .status("PENDING")
                .priority("LOW")
                .userId(99999L) // Non-existent user
                .build();

        assertThrows(IllegalArgumentException.class, () -> {
            taskService.createTask(request);
        });
    }

    @Test
    void shouldThrowExceptionForNonExistentTask() {
        assertThrows(IllegalArgumentException.class, () -> {
            taskService.getTaskById(99999L);
        });
    }
}