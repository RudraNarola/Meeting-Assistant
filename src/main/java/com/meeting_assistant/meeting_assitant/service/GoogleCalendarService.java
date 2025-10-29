package com.meeting_assistant.meeting_assitant.service;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.google.api.client.util.DateTime;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.services.calendar.Calendar;
import com.google.api.services.calendar.model.Event;
import com.google.api.services.calendar.model.EventDateTime;
import com.google.api.services.calendar.model.Events;
import com.meeting_assistant.meeting_assitant.exception.GoogleCalendarServiceException;
import com.meeting_assistant.meeting_assitant.model.GoogleCalendarConnection;
import com.meeting_assistant.meeting_assitant.model.SyncLog;
import com.meeting_assistant.meeting_assitant.model.Task;
import com.meeting_assistant.meeting_assitant.model.User;
import com.meeting_assistant.meeting_assitant.repository.GoogleCalendarConnectionRepository;
import com.meeting_assistant.meeting_assitant.repository.SyncLogRepository;
import com.meeting_assistant.meeting_assitant.repository.TaskRepository;
import com.meeting_assistant.meeting_assitant.util.DateTimeUtil;

@Service
public class GoogleCalendarService {

    private static final Logger logger = LoggerFactory.getLogger(GoogleCalendarService.class);

    @Autowired
    private GoogleCalendarConnectionRepository connectionRepository;

    @Autowired
    private GoogleCalendarConnectionService connectionService;

    @Autowired
    private SyncLogRepository syncLogRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private GoogleOAuthService googleOAuthService;

    @Autowired
    private NetHttpTransport httpTransport;

    @Autowired
    private JsonFactory jsonFactory;

    /**
     * Creates a new event in Google Calendar for the given task
     * 
     * @param task The task to create an event for
     * @return The created Event with Google event ID
     * @throws GoogleCalendarServiceException if creation fails
     */
    public Event createEvent(Task task) {
        logger.info("Creating Google Calendar event for task ID: {}", task.getId());

        try {
            Calendar calendarService = getCalendarService(task.getUser());
            Event event = mapTaskToEvent(task);

            Event createdEvent = calendarService.events()
                    .insert("primary", event)
                    .execute();

            // Update task with Google event ID
            task.setGoogleEventId(createdEvent.getId());
            taskRepository.save(task);

            // Log successful sync
            logSyncOperation(task.getUser(), "CREATE", "SUCCESS",
                    "Created event: " + createdEvent.getId());

            logger.info("Successfully created Google Calendar event: {} for task: {}",
                    createdEvent.getId(), task.getId());

            return createdEvent;

        } catch (IOException e) {
            logger.error("Failed to create Google Calendar event for task: {}", task.getId(), e);
            logSyncOperation(task.getUser(), "CREATE", "FAILED",
                    "Error creating event: " + e.getMessage());
            throw new GoogleCalendarServiceException("Failed to create calendar event", e);
        }
    }

    /**
     * Updates an existing event in Google Calendar
     * 
     * @param task The task to update the event for
     * @return The updated Event
     * @throws GoogleCalendarServiceException if update fails
     */
    public Event updateEvent(Task task) {
        logger.info("Updating Google Calendar event for task ID: {}", task.getId());

        if (task.getGoogleEventId() == null) {
            logger.warn("Task {} has no Google event ID, creating new event instead", task.getId());
            return createEvent(task);
        }

        try {
            Calendar calendarService = getCalendarService(task.getUser());
            Event updatedEventData = mapTaskToEvent(task);

            Event updatedEvent = calendarService.events()
                    .update("primary", task.getGoogleEventId(), updatedEventData)
                    .execute();

            // Log successful sync
            logSyncOperation(task.getUser(), "UPDATE", "SUCCESS",
                    "Updated event: " + updatedEvent.getId());

            logger.info("Successfully updated Google Calendar event: {} for task: {}",
                    updatedEvent.getId(), task.getId());

            return updatedEvent;

        } catch (IOException e) {
            logger.error("Failed to update Google Calendar event for task: {}", task.getId(), e);
            logSyncOperation(task.getUser(), "UPDATE", "FAILED",
                    "Error updating event: " + e.getMessage());
            throw new GoogleCalendarServiceException("Failed to update calendar event", e);
        }
    }

    /**
     * Deletes an event from Google Calendar
     * 
     * @param task The task to delete the event for
     * @throws GoogleCalendarServiceException if deletion fails
     */
    public void deleteEvent(Task task) {
        logger.info("Deleting Google Calendar event for task ID: {}", task.getId());

        if (task.getGoogleEventId() == null) {
            logger.warn("Task {} has no Google event ID, nothing to delete", task.getId());
            return;
        }

        try {
            Calendar calendarService = getCalendarService(task.getUser());

            calendarService.events()
                    .delete("primary", task.getGoogleEventId())
                    .execute();

            // Clear Google event ID from task
            task.setGoogleEventId(null);
            taskRepository.save(task);

            // Log successful sync
            logSyncOperation(task.getUser(), "DELETE", "SUCCESS",
                    "Deleted event: " + task.getGoogleEventId());

            logger.info("Successfully deleted Google Calendar event for task: {}", task.getId());

        } catch (IOException e) {
            logger.error("Failed to delete Google Calendar event for task: {}", task.getId(), e);
            logSyncOperation(task.getUser(), "DELETE", "FAILED",
                    "Error deleting event: " + e.getMessage());
            throw new GoogleCalendarServiceException("Failed to delete calendar event", e);
        }
    }

    /**
     * Lists events from Google Calendar for a user within a date range
     * 
     * @param user    The user whose calendar to query
     * @param timeMin Start time (inclusive)
     * @param timeMax End time (exclusive)
     * @return List of events from Google Calendar
     * @throws GoogleCalendarServiceException if listing fails
     */
    public List<Event> listEvents(User user, OffsetDateTime timeMin, OffsetDateTime timeMax) {
        logger.info("Listing Google Calendar events for user: {} from {} to {}",
                user.getId(), timeMin, timeMax);

        try {
            Calendar calendarService = getCalendarService(user);

            DateTime startTime = new DateTime(DateTimeUtil.toUtcString(timeMin));
            DateTime endTime = new DateTime(DateTimeUtil.toUtcString(timeMax));

            Events events = calendarService.events()
                    .list("primary")
                    .setTimeMin(startTime)
                    .setTimeMax(endTime)
                    .setOrderBy("startTime")
                    .setSingleEvents(true)
                    .execute();

            List<Event> eventList = events.getItems();

            // Log successful sync
            logSyncOperation(user, "LIST", "SUCCESS",
                    "Retrieved " + eventList.size() + " events");

            logger.info("Successfully retrieved {} events for user: {}", eventList.size(), user.getId());

            return eventList;

        } catch (IOException e) {
            logger.error("Failed to list Google Calendar events for user: {}", user.getId(), e);
            logSyncOperation(user, "LIST", "FAILED",
                    "Error listing events: " + e.getMessage());
            throw new GoogleCalendarServiceException("Failed to list calendar events", e);
        }
    }

    /**
     * List events updated since a given timestamp (uses
     * Events.list().setUpdatedMin())
     */
    public List<Event> listEventsUpdatedSince(User user, OffsetDateTime updatedSince, int maxResults) {
        logger.info("Listing Google Calendar events updated since {} for user: {}", updatedSince, user.getId());

        try {
            Calendar calendarService = getCalendarService(user);

            DateTime updated = new DateTime(DateTimeUtil.toUtcString(updatedSince));

            List<Event> results = new java.util.ArrayList<>();
            String pageToken = null;

            do {
                Events events = calendarService.events()
                        .list("primary")
                        .setUpdatedMin(updated)
                        .setSingleEvents(true)
                        .setMaxResults(Integer.valueOf(Math.min(maxResults, 250)))
                        .setPageToken(pageToken)
                        .execute();

                if (events.getItems() != null)
                    results.addAll(events.getItems());

                pageToken = events.getNextPageToken();
                // avoid accumulating too many results in one run
                if (results.size() >= maxResults)
                    break;
            } while (pageToken != null);

            logSyncOperation(user, "INBOUND_LIST", "SUCCESS", "Retrieved " + results.size() + " events");
            return results;
        } catch (IOException e) {
            logger.error("Failed to list updated events for user: {}", user.getId(), e);
            logSyncOperation(user, "INBOUND_LIST", "FAILED", "Error listing updated events: " + e.getMessage());
            throw new GoogleCalendarServiceException("Failed to list updated events", e);
        }
    }

    /**
     * Maps a Task entity to a Google Calendar Event
     * 
     * @param task The task to map
     * @return Google Calendar Event
     */
    private Event mapTaskToEvent(Task task) {
        Event event = new Event();

        // Basic event details
        event.setSummary(task.getTitle());
        event.setDescription(buildEventDescription(task));

        // Set event timing
        EventDateTime start = new EventDateTime();
        EventDateTime end = new EventDateTime();

        if (task.getDueDate() != null) {
            // Use due date as start time
            String startTimeIso = DateTimeUtil.toUtcString(task.getDueDate());
            start.setDateTime(new DateTime(startTimeIso));

            // End time is 1 hour after start (configurable duration)
            String endTimeIso = DateTimeUtil.toUtcString(task.getDueDate().plusHours(1));
            end.setDateTime(new DateTime(endTimeIso));
        } else {
            // Default to current time if no due date
            OffsetDateTime now = OffsetDateTime.now();
            start.setDateTime(new DateTime(DateTimeUtil.toUtcString(now)));
            end.setDateTime(new DateTime(DateTimeUtil.toUtcString(now.plusHours(1))));
        }

        event.setStart(start);
        event.setEnd(end);

        // Set color based on priority
        event.setColorId(mapPriorityToColor(task.getPriority()));

        return event;
    }

    /**
     * Builds event description with task metadata
     */
    private String buildEventDescription(Task task) {
        StringBuilder description = new StringBuilder();

        if (task.getDescription() != null && !task.getDescription().trim().isEmpty()) {
            description.append(task.getDescription()).append("\n\n");
        }

        description.append("--- Task Details ---\n");
        description.append("Status: ").append(task.getStatus()).append("\n");
        description.append("Priority: ").append(getPriorityName(task.getPriority())).append("\n");
        description.append("Task ID: ").append(task.getId()).append("\n");

        if (task.getCreatedAt() != null) {
            description.append("Created: ")
                    .append(task.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                    .append("\n");
        }

        return description.toString();
    }

    /**
     * Maps task priority to Google Calendar color ID
     * 
     * @param priority Task priority (1-5)
     * @return Google Calendar color ID
     */
    private String mapPriorityToColor(String priority) {
        if (priority == null)
            return "1"; // Default blue

        return switch (priority.toUpperCase()) {
            case "CRITICAL" -> "11"; // Red (Highest priority)
            case "HIGH" -> "6"; // Orange (High priority)
            case "MEDIUM" -> "5"; // Yellow (Medium priority)
            case "LOW" -> "2"; // Green (Low priority)
            default -> "1"; // Default blue
        };
    }

    /**
     * Gets human-readable priority name
     */
    private String getPriorityName(String priority) {
        if (priority == null)
            return "Normal";

        return switch (priority.toUpperCase()) {
            case "CRITICAL" -> "Critical";
            case "HIGH" -> "High";
            case "MEDIUM" -> "Medium";
            case "LOW" -> "Low";
            default -> "Normal";
        };
    }

    /**
     * Gets authenticated Calendar service for a user
     */
    private Calendar getCalendarService(User user) {
        logger.info("Getting Calendar service for user: {}", user.getId());

        Optional<GoogleCalendarConnection> connectionOpt = connectionRepository.findByUserAndIsActiveTrue(user);

        if (connectionOpt.isEmpty()) {
            logger.error("No active Google Calendar connection found for user: {}", user.getId());
            throw new GoogleCalendarServiceException(
                    "No active Google Calendar connection found for user: " + user.getId());
        }

        GoogleCalendarConnection connection = connectionOpt.get();
        logger.info("Found Google Calendar connection for user: {}, active: {}", user.getId(),
                connection.getIsActive());
        logger.debug("Access token exists: {}, Refresh token exists: {}",
                connection.getAccessToken() != null, connection.getRefreshToken() != null);

        try {
            // Get decrypted credentials
            GoogleCalendarConnectionService.DecryptedCredentials credentials = connectionService
                    .getDecryptedCredentials(connection);

            logger.info("Successfully obtained decrypted credentials for user: {}", user.getId());

            // Use the OAuth service to build a proper credential with refresh capability
            com.google.api.client.auth.oauth2.Credential credential = googleOAuthService
                    .buildCredentialFromTokens(
                            credentials.getAccessToken(),
                            credentials.getRefreshToken(),
                            null);

            logger.info("Successfully created OAuth credential for user: {}", user.getId());

            return new Calendar.Builder(httpTransport, jsonFactory, credential)
                    .setApplicationName("meeting-assitant")
                    .build();
        } catch (Exception e) {
            logger.error("Failed to create Calendar service for user: {}, error: {}", user.getId(), e.getMessage(), e);
            throw new GoogleCalendarServiceException(
                    "Failed to create Calendar service for user: " + user.getId(), e);
        }
    }

    /**
     * Logs sync operation to database
     */
    private void logSyncOperation(User user, String operation, String status, String details) {
        try {
            SyncLog syncLog = SyncLog.builder()
                    .user(user)
                    .action(operation)
                    .success("SUCCESS".equals(status))
                    .message(details)
                    .occurredAt(OffsetDateTime.now())
                    .build();

            syncLogRepository.save(syncLog);
        } catch (Exception e) {
            logger.warn("Failed to log sync operation: {}", e.getMessage());
        }
    }
}