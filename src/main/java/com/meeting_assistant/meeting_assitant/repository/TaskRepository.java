package com.meeting_assistant.meeting_assitant.repository;

import java.time.OffsetDateTime;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.meeting_assistant.meeting_assitant.model.Task;
import com.meeting_assistant.meeting_assitant.model.User;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {

    /**
     * Find all tasks for a user
     */
    List<Task> findByUser(User user);

    /**
     * Find all tasks for a user with pagination
     */
    Page<Task> findByUser(User user, Pageable pageable);

    /**
     * Find tasks by user and status
     */
    Page<Task> findByUserAndStatus(User user, String status, Pageable pageable);

    /**
     * Find tasks by user and due date range
     */
    Page<Task> findByUserAndDueDateBetween(User user, OffsetDateTime fromDate, OffsetDateTime toDate,
            Pageable pageable);

    /**
     * Find tasks by user, status, and due date range
     */
    Page<Task> findByUserAndStatusAndDueDateBetween(User user, String status, OffsetDateTime fromDate,
            OffsetDateTime toDate, Pageable pageable);

}
