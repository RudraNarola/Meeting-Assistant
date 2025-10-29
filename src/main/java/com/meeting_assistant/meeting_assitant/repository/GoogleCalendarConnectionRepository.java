package com.meeting_assistant.meeting_assitant.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.meeting_assistant.meeting_assitant.model.GoogleCalendarConnection;
import com.meeting_assistant.meeting_assitant.model.User;

@Repository
public interface GoogleCalendarConnectionRepository extends JpaRepository<GoogleCalendarConnection, Long> {

    /**
     * Find active Google Calendar connection for a user
     */
    Optional<GoogleCalendarConnection> findByUserAndIsActiveTrue(User user);

    /**
     * Find all active Google Calendar connections
     */
    List<GoogleCalendarConnection> findAllByIsActiveTrue();

}
