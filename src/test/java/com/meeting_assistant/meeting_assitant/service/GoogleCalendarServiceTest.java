package com.meeting_assistant.meeting_assitant.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.io.IOException;
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

import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.Calendar;
import com.google.api.services.calendar.model.Event;
import com.google.api.services.calendar.model.EventDateTime;
import com.google.api.services.calendar.model.Events;
import com.meeting_assistant.meeting_assitant.config.GoogleCalendarConfig;
import com.meeting_assistant.meeting_assitant.exception.GoogleCalendarServiceException;
import com.meeting_assistant.meeting_assitant.model.GoogleCalendarConnection;
import com.meeting_assistant.meeting_assitant.model.Task;
import com.meeting_assistant.meeting_assitant.model.User;
import com.meeting_assistant.meeting_assitant.repository.GoogleCalendarConnectionRepository;
import com.meeting_assistant.meeting_assitant.repository.SyncLogRepository;
import com.meeting_assistant.meeting_assitant.repository.TaskRepository;

@ExtendWith(MockitoExtension.class)
class GoogleCalendarServiceTest {

    @Mock
    private GoogleCalendarConfig googleCalendarConfig;

    @Mock
    private GoogleCalendarConnectionRepository connectionRepository;

    @Mock
    private SyncLogRepository syncLogRepository;

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private Calendar calendarService;

    @Mock
    private Calendar.Events eventsResource;

    @Mock
    private Calendar.Events.Insert insertRequest;

    @Mock
    private Calendar.Events.Update updateRequest;

    @Mock
    private Calendar.Events.Delete deleteRequest;

    @Mock
    private Calendar.Events.List listRequest;

    @InjectMocks
    private GoogleCalendarService googleCalendarService;

    private User testUser;
    private Task testTask;
    private GoogleCalendarConnection testConnection;

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
                .priority((short) 3)
                .build();

        testConnection = GoogleCalendarConnection.builder()
                .id(1L)
                .user(testUser)
                .accessToken("access-token")
                .refreshToken("refresh-token")
                .isActive(true)
                .build();
    }

    @Test
    void createEvent_Success() throws IOException {
        // Given
        Event createdEvent = new Event();
        createdEvent.setId("event-123");
        createdEvent.setSummary("Test Task");

        when(connectionRepository.findByUserAndIsActiveTrue(testUser))
                .thenReturn(Optional.of(testConnection));
        when(googleCalendarConfig.createCalendarService(anyString(), anyString()))
                .thenReturn(calendarService);
        when(calendarService.events()).thenReturn(eventsResource);
        when(eventsResource.insert(eq("primary"), any(Event.class)))
                .thenReturn(insertRequest);
        when(insertRequest.execute()).thenReturn(createdEvent);
        when(taskRepository.save(any(Task.class))).thenReturn(testTask);

        // When
        Event result = googleCalendarService.createEvent(testTask);

        // Then
        assertNotNull(result);
        assertEquals("event-123", result.getId());
        assertEquals("Test Task", result.getSummary());
        verify(taskRepository).save(testTask);
        verify(syncLogRepository).save(any());
        assertEquals("event-123", testTask.getGoogleEventId());
    }

    @Test
    void createEvent_NoConnection_ThrowsException() {
        // Given
        when(connectionRepository.findByUserAndIsActiveTrue(testUser))
                .thenReturn(Optional.empty());

        // When & Then
        GoogleCalendarServiceException exception = assertThrows(
                GoogleCalendarServiceException.class,
                () -> googleCalendarService.createEvent(testTask));

        assertTrue(exception.getMessage().contains("No active Google Calendar connection"));
    }

    @Test
    void createEvent_IOException_ThrowsException() throws IOException {
        // Given
        when(connectionRepository.findByUserAndIsActiveTrue(testUser))
                .thenReturn(Optional.of(testConnection));
        when(googleCalendarConfig.createCalendarService(anyString(), anyString()))
                .thenReturn(calendarService);
        when(calendarService.events()).thenReturn(eventsResource);
        when(eventsResource.insert(eq("primary"), any(Event.class)))
                .thenReturn(insertRequest);
        when(insertRequest.execute()).thenThrow(new IOException("API Error"));

        // When & Then
        GoogleCalendarServiceException exception = assertThrows(
                GoogleCalendarServiceException.class,
                () -> googleCalendarService.createEvent(testTask));

        assertTrue(exception.getMessage().contains("Failed to create calendar event"));
        verify(syncLogRepository).save(any()); // Should log the failure
    }

    @Test
    void updateEvent_Success() throws IOException {
        // Given
        testTask.setGoogleEventId("event-123");
        Event updatedEvent = new Event();
        updatedEvent.setId("event-123");
        updatedEvent.setSummary("Updated Test Task");

        when(connectionRepository.findByUserAndIsActiveTrue(testUser))
                .thenReturn(Optional.of(testConnection));
        when(googleCalendarConfig.createCalendarService(anyString(), anyString()))
                .thenReturn(calendarService);
        when(calendarService.events()).thenReturn(eventsResource);
        when(eventsResource.update(eq("primary"), eq("event-123"), any(Event.class)))
                .thenReturn(updateRequest);
        when(updateRequest.execute()).thenReturn(updatedEvent);

        // When
        Event result = googleCalendarService.updateEvent(testTask);

        // Then
        assertNotNull(result);
        assertEquals("event-123", result.getId());
        verify(syncLogRepository).save(any());
    }

    @Test
    void updateEvent_NoEventId_CreatesNewEvent() throws IOException {
        // Given
        testTask.setGoogleEventId(null);
        Event createdEvent = new Event();
        createdEvent.setId("new-event-123");

        when(connectionRepository.findByUserAndIsActiveTrue(testUser))
                .thenReturn(Optional.of(testConnection));
        when(googleCalendarConfig.createCalendarService(anyString(), anyString()))
                .thenReturn(calendarService);
        when(calendarService.events()).thenReturn(eventsResource);
        when(eventsResource.insert(eq("primary"), any(Event.class)))
                .thenReturn(insertRequest);
        when(insertRequest.execute()).thenReturn(createdEvent);
        when(taskRepository.save(any(Task.class))).thenReturn(testTask);

        // When
        Event result = googleCalendarService.updateEvent(testTask);

        // Then
        assertNotNull(result);
        assertEquals("new-event-123", result.getId());
        verify(eventsResource).insert(eq("primary"), any(Event.class));
        verify(eventsResource, never()).update(anyString(), anyString(), any(Event.class));
    }

    @Test
    void deleteEvent_Success() throws IOException {
        // Given
        testTask.setGoogleEventId("event-123");

        when(connectionRepository.findByUserAndIsActiveTrue(testUser))
                .thenReturn(Optional.of(testConnection));
        when(googleCalendarConfig.createCalendarService(anyString(), anyString()))
                .thenReturn(calendarService);
        when(calendarService.events()).thenReturn(eventsResource);
        when(eventsResource.delete("primary", "event-123"))
                .thenReturn(deleteRequest);
        when(taskRepository.save(any(Task.class))).thenReturn(testTask);

        // When
        assertDoesNotThrow(() -> googleCalendarService.deleteEvent(testTask));

        // Then
        verify(deleteRequest).execute();
        verify(taskRepository).save(testTask);
        verify(syncLogRepository).save(any());
        assertNull(testTask.getGoogleEventId());
    }

    @Test
    void deleteEvent_NoEventId_DoesNothing() {
        // Given
        testTask.setGoogleEventId(null);

        // When
        assertDoesNotThrow(() -> googleCalendarService.deleteEvent(testTask));

        // Then
        verify(calendarService, never()).events();
        verify(syncLogRepository, never()).save(any());
    }

    @Test
    void listEvents_Success() throws IOException {
        // Given
        OffsetDateTime timeMin = OffsetDateTime.now();
        OffsetDateTime timeMax = timeMin.plusDays(7);

        Event event1 = new Event();
        event1.setId("event-1");
        event1.setSummary("Event 1");

        Event event2 = new Event();
        event2.setId("event-2");
        event2.setSummary("Event 2");

        Events eventsResponse = new Events();
        eventsResponse.setItems(Arrays.asList(event1, event2));

        when(connectionRepository.findByUserAndIsActiveTrue(testUser))
                .thenReturn(Optional.of(testConnection));
        when(googleCalendarConfig.createCalendarService(anyString(), anyString()))
                .thenReturn(calendarService);
        when(calendarService.events()).thenReturn(eventsResource);
        when(eventsResource.list("primary")).thenReturn(listRequest);
        when(listRequest.setTimeMin(any(DateTime.class))).thenReturn(listRequest);
        when(listRequest.setTimeMax(any(DateTime.class))).thenReturn(listRequest);
        when(listRequest.setOrderBy(anyString())).thenReturn(listRequest);
        when(listRequest.setSingleEvents(anyBoolean())).thenReturn(listRequest);
        when(listRequest.execute()).thenReturn(eventsResponse);

        // When
        List<Event> result = googleCalendarService.listEvents(testUser, timeMin, timeMax);

        // Then
        assertNotNull(result);
        assertEquals(2, result.size());
        assertEquals("event-1", result.get(0).getId());
        assertEquals("event-2", result.get(1).getId());
        verify(syncLogRepository).save(any());
    }

    @Test
    void mapTaskToEvent_WithDueDate_SetsCorrectTiming() {
        // This tests the private method indirectly through createEvent
        // Given
        OffsetDateTime dueDate = OffsetDateTime.now().plusDays(1);
        testTask.setDueDate(dueDate);
        testTask.setPriority((short) 5); // Highest priority

        Event createdEvent = new Event();
        createdEvent.setId("event-123");

        try {
            when(connectionRepository.findByUserAndIsActiveTrue(testUser))
                    .thenReturn(Optional.of(testConnection));
            when(googleCalendarConfig.createCalendarService(anyString(), anyString()))
                    .thenReturn(calendarService);
            when(calendarService.events()).thenReturn(eventsResource);
            when(eventsResource.insert(eq("primary"), any(Event.class)))
                    .thenReturn(insertRequest);
            when(insertRequest.execute()).thenReturn(createdEvent);
            when(taskRepository.save(any(Task.class))).thenReturn(testTask);

            // When
            googleCalendarService.createEvent(testTask);

            // Then - verify the event was created with correct properties
            verify(insertRequest).execute();
            verify(eventsResource).insert(eq("primary"), argThat(event -> {
                // Verify event properties
                assertEquals("Test Task", event.getSummary());
                assertTrue(event.getDescription().contains("Test Description"));
                assertTrue(event.getDescription().contains("Priority: Critical"));
                assertEquals("11", event.getColorId()); // Red color for highest priority
                return true;
            }));

        } catch (IOException e) {
            fail("Should not throw exception");
        }
    }
}