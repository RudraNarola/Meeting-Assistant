package com.meeting_assistant.meeting_assitant.service;

import java.util.List;
import java.util.Objects;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.google.api.services.calendar.model.Event;
import com.google.api.client.util.DateTime;
import com.meeting_assistant.meeting_assitant.model.GoogleCalendarConnection;
import com.meeting_assistant.meeting_assitant.model.Task;
import com.meeting_assistant.meeting_assitant.repository.GoogleCalendarConnectionRepository;
import com.meeting_assistant.meeting_assitant.repository.SyncLogRepository;
import com.meeting_assistant.meeting_assitant.repository.TaskRepository;
import com.meeting_assistant.meeting_assitant.util.DateTimeUtil;

import java.time.OffsetDateTime;

@Service
public class GoogleInboundSyncService {

    private static final Logger logger = LoggerFactory.getLogger(GoogleInboundSyncService.class);

    private final GoogleCalendarConnectionRepository connectionRepository;
    private final GoogleCalendarService googleCalendarService;
    private final TaskRepository taskRepository;
    private final SyncLogRepository syncLogRepository;

    public GoogleInboundSyncService(GoogleCalendarConnectionRepository connectionRepository,
            GoogleCalendarService googleCalendarService, TaskRepository taskRepository,
            SyncLogRepository syncLogRepository) {
        this.connectionRepository = connectionRepository;
        this.googleCalendarService = googleCalendarService;
        this.taskRepository = taskRepository;
        this.syncLogRepository = syncLogRepository;
    }

    /**
     * Runs every 5 minutes by default; configurable via property
     */
    @Scheduled(fixedDelayString = "${google.inbound-sync.fixed-delay-ms:10000}")
    @Transactional
    public void runInboundSync() {
        logger.info("Starting inbound Google Calendar sync job");

        List<GoogleCalendarConnection> connections = connectionRepository.findAllByIsActiveTrue();

        for (GoogleCalendarConnection conn : connections) {
            try {
                OffsetDateTime lastSync = conn.getLastSync();
                if (lastSync == null) {
                    // default to last 24 hours if we never synced before
                    lastSync = DateTimeUtil.nowUtc().minusDays(1);
                }

                logger.info("Syncing connection id={} user={} since={}", conn.getId(), conn.getUser().getId(),
                        lastSync);

                List<Event> events = googleCalendarService.listEventsUpdatedSince(conn.getUser(), lastSync, 250);

                for (Event e : events) {
                    // Skip null id events
                    if (e == null || e.getId() == null)
                        continue;
                    String eventId = e.getId();

                    // If event is cancelled remotely
                    if ("cancelled".equalsIgnoreCase(e.getStatus())) {
                        Task existing = taskRepository.findByGoogleEventId(eventId);
                        if (existing != null) {
                            existing.setStatus("CANCELLED");
                            existing.setUpdatedAt(DateTimeUtil.nowUtc());
                            taskRepository.save(existing);
                            // log
                            syncLogRepository.save(com.meeting_assistant.meeting_assitant.model.SyncLog.builder()
                                    .user(conn.getUser())
                                    .task(existing)
                                    .eventId(eventId)
                                    .action("INBOUND_DELETE")
                                    .success(true)
                                    .message("Marked task cancelled due to remote deletion")
                                    .occurredAt(DateTimeUtil.nowUtc())
                                    .build());
                        }
                        continue;
                    }

                    // Map event to task fields
                    Task existing = taskRepository.findByGoogleEventId(eventId);

                    // Determine start time if available
                    DateTime start = e.getStart() != null ? e.getStart().getDateTime() : null;

                    OffsetDateTime dueDate = null;
                    if (start != null) {
                        dueDate = DateTimeUtil.fromEpochMilli(start.getValue());
                    }

                    if (existing == null) {
                        // create simple new task
                        Task t = Task.builder()
                                .user(conn.getUser())
                                .title(Objects.toString(e.getSummary(), "(no title)"))
                                .description(Objects.toString(e.getDescription(), ""))
                                .dueDate(dueDate)
                                .status("PENDING")
                                .priority(null)
                                .googleEventId(eventId)
                                .createdAt(DateTimeUtil.nowUtc())
                                .updatedAt(DateTimeUtil.nowUtc())
                                .build();

                        taskRepository.save(t);

                        syncLogRepository.save(com.meeting_assistant.meeting_assitant.model.SyncLog.builder()
                                .user(conn.getUser())
                                .task(t)
                                .eventId(eventId)
                                .action("INBOUND_CREATE")
                                .success(true)
                                .message("Created task from Google event")
                                .occurredAt(DateTimeUtil.nowUtc())
                                .build());
                    } else {
                        // update existing task
                        existing.setTitle(Objects.toString(e.getSummary(), existing.getTitle()));
                        existing.setDescription(Objects.toString(e.getDescription(), existing.getDescription()));
                        if (dueDate != null)
                            existing.setDueDate(dueDate);
                        existing.setUpdatedAt(DateTimeUtil.nowUtc());
                        taskRepository.save(existing);

                        syncLogRepository.save(com.meeting_assistant.meeting_assitant.model.SyncLog.builder()
                                .user(conn.getUser())
                                .task(existing)
                                .eventId(eventId)
                                .action("INBOUND_UPDATE")
                                .success(true)
                                .message("Updated task from Google event change")
                                .occurredAt(DateTimeUtil.nowUtc())
                                .build());
                    }
                }

                // update lastSync timestamp
                conn.setLastSync(DateTimeUtil.nowUtc());
                connectionRepository.save(conn);

            } catch (Exception ex) {
                logger.error("Error syncing connection id={}: {}", conn.getId(), ex.getMessage(), ex);
                // record failure
                syncLogRepository.save(com.meeting_assistant.meeting_assitant.model.SyncLog.builder()
                        .user(conn.getUser())
                        .action("INBOUND_SYNC")
                        .success(false)
                        .message("Error during inbound sync: " + ex.getMessage())
                        .occurredAt(DateTimeUtil.nowUtc())
                        .build());
            }
        }

        logger.info("Inbound Google Calendar sync job completed");
    }

}
