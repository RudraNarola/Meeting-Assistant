package com.meeting_assistant.meeting_assitant;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class MeetingAssitantApplication {

	private static final Logger logger = LoggerFactory.getLogger(MeetingAssitantApplication.class);

	public static void main(String[] args) {
		logger.info("Starting MeetingAssistant application");
		SpringApplication.run(MeetingAssitantApplication.class, args);
	}

}
