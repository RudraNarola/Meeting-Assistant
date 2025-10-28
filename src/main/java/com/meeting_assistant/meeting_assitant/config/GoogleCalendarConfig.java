package com.meeting_assistant.meeting_assitant.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.client.json.JsonFactory;
import com.google.api.services.calendar.Calendar;

/**
 * Google Calendar configuration and small factory to create per-user Calendar
 * clients.
 *
 * Why we need it:
 * - Google Calendar client requires shared infrastructure: an HTTP transport
 * and JSON factory.
 * - We also need a place to centralize client-id/secret and to create Calendar
 * clients from stored
 * OAuth2 credentials (access + refresh tokens).
 *
 * Role:
 * - Provide reusable transport and JSON beans used by Google API clients.
 * - Expose a small factory that builds a configured
 * `com.google.api.services.calendar.Calendar` instance
 * for a specific user when given their access and refresh tokens.
 */
@Configuration
public class GoogleCalendarConfig {

    private static final Logger logger = LoggerFactory.getLogger(GoogleCalendarConfig.class);

    @Value("${spring.application.name:meeting-assitant}")
    private String applicationName;

    @Bean
    public NetHttpTransport googleNetHttpTransport() {
        try {
            NetHttpTransport t = GoogleNetHttpTransport.newTrustedTransport();
            logger.info("Created Google NetHttpTransport");
            return t;
        } catch (Exception e) {
            throw new IllegalStateException("Failed to create Google NetHttpTransport", e);
        }
    }

    @Bean
    public JsonFactory jacksonFactory() {
        // Use GsonFactory instead of deprecated JacksonFactory
        return GsonFactory.getDefaultInstance();
    }

    @Bean
    public GoogleCalendarClientFactory googleCalendarClientFactory(NetHttpTransport transport,
            JsonFactory jsonFactory, com.meeting_assistant.meeting_assitant.service.GoogleOAuthService oauthService) {
        logger.info("Creating GoogleCalendarClientFactory with applicationName={}", applicationName);
        return new GoogleCalendarClientFactory(transport, jsonFactory, applicationName, oauthService);
    }

    public static class GoogleCalendarClientFactory {
        private final NetHttpTransport transport;
        private final JsonFactory jsonFactory;
        private final String applicationName;
        private final com.meeting_assistant.meeting_assitant.service.GoogleOAuthService oauthService;

        public GoogleCalendarClientFactory(NetHttpTransport transport, JsonFactory jsonFactory, String applicationName,
                com.meeting_assistant.meeting_assitant.service.GoogleOAuthService oauthService) {
            this.transport = transport;
            this.jsonFactory = jsonFactory;
            this.applicationName = applicationName;
            this.oauthService = oauthService;
        }

        /**
         * Build a Calendar client for a user using their access + refresh tokens.
         * Note: the returned Calendar client will use the provided tokens. If the
         * access token
         * is expired, code that calls the API should attempt to refresh the token using
         * the
         * stored refresh token and update persistence accordingly.
         */
        public Calendar buildCalendarClient(String accessToken, String refreshToken) {
            try {
                // Use the OAuth service to build a Credential from tokens (modern flow)
                com.google.api.client.auth.oauth2.Credential credential = oauthService
                        .buildCredentialFromTokens(accessToken, refreshToken, null);
                logger.debug("Building Calendar client for applicationName={}", applicationName);
                return new Calendar.Builder(transport, jsonFactory, credential).setApplicationName(applicationName)
                        .build();
            } catch (Exception e) {
                throw new IllegalStateException("Failed to build Google Calendar client", e);
            }
        }

    }

}
