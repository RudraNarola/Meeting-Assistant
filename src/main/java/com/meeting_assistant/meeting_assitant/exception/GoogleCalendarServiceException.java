package com.meeting_assistant.meeting_assitant.exception;

/**
 * Exception thrown when Google Calendar API operations fail
 */
public class GoogleCalendarServiceException extends RuntimeException {

    public GoogleCalendarServiceException(String message) {
        super(message);
    }

    public GoogleCalendarServiceException(String message, Throwable cause) {
        super(message, cause);
    }

    public GoogleCalendarServiceException(Throwable cause) {
        super(cause);
    }
}