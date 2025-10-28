package com.meeting_assistant.meeting_assitant.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.meeting_assistant.meeting_assitant.model.SyncLog;

@Repository
public interface SyncLogRepository extends JpaRepository<SyncLog, Long> {

}
