package com.meeting_assistant.meeting_assitant.service;

import java.time.OffsetDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.meeting_assistant.meeting_assitant.model.GoogleCalendarConnection;
import com.meeting_assistant.meeting_assitant.model.User;
import com.meeting_assistant.meeting_assitant.repository.GoogleCalendarConnectionRepository;
import com.meeting_assistant.meeting_assitant.repository.UserRepository;
import com.meeting_assistant.meeting_assitant.util.DateTimeUtil;
import com.meeting_assistant.meeting_assitant.util.TokenEncryptionUtil;

import com.google.api.client.auth.oauth2.Credential;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class GoogleCalendarConnectionService {

    private static final Logger logger = LoggerFactory.getLogger(GoogleCalendarConnectionService.class);

    private final GoogleCalendarConnectionRepository repo;
    private final UserRepository userRepo;
    private final GoogleOAuthService oauthService;
    private final String encryptionSecret;

    public GoogleCalendarConnectionService(GoogleCalendarConnectionRepository repo, UserRepository userRepo,
            GoogleOAuthService oauthService,
            @Value("${ENCRYPTION_SECRET:${encryption.secret:change-me}}") String encryptionSecret) {
        this.repo = repo;
        this.userRepo = userRepo;
        this.oauthService = oauthService;
        this.encryptionSecret = encryptionSecret;
    }

    @Transactional
    public GoogleCalendarConnection saveOrUpdateConnection(Long userId, String calendarId, String accessToken,
            String refreshToken, Long expiresInSeconds) {
        logger.info("Saving Google Calendar connection for userId: {}, calendarId: {}", userId, calendarId);
        logger.info("Token details - Access token: {}, Refresh token: {}, Expires in: {} seconds",
                accessToken != null ? "present" : "null",
                refreshToken != null ? "present" : "null",
                expiresInSeconds);

        User user = userRepo.findById(userId).orElseGet(() -> {
            logger.warn("User {} not found, creating placeholder user", userId);
            User u = User.builder().username("user" + userId).email("user" + userId + "@local").build();
            return userRepo.save(u);
        });

        GoogleCalendarConnection conn = new GoogleCalendarConnection();
        conn.setUser(user);
        conn.setCalendarId(calendarId == null ? "primary" : calendarId);

        if (accessToken != null) {
            logger.info("Encrypting and storing access token");
            conn.setAccessToken(TokenEncryptionUtil.encrypt(accessToken, encryptionSecret));
        }
        if (refreshToken != null) {
            logger.info("Encrypting and storing refresh token");
            conn.setRefreshToken(TokenEncryptionUtil.encrypt(refreshToken, encryptionSecret));
        }
        if (expiresInSeconds != null) {
            OffsetDateTime expiry = DateTimeUtil.nowUtc().plusSeconds(expiresInSeconds);
            logger.info("Setting token expiry to: {}", expiry);
            conn.setTokenExpiry(expiry);
        }

        conn.setCreatedAt(DateTimeUtil.nowUtc());
        conn.setUpdatedAt(DateTimeUtil.nowUtc());

        GoogleCalendarConnection saved = repo.save(conn);
        logger.info("Successfully saved Google Calendar connection with ID: {} for user: {}", saved.getId(), userId);
        return saved;
    }

    /**
     * Scheduled job to refresh tokens that expire in less than 5 minutes.
     * Runs every 30 minutes.
     */
    @Scheduled(fixedDelayString = "PT30M")
    @Transactional
    public void refreshExpiringTokens() {
        List<GoogleCalendarConnection> all = repo.findAll();
        OffsetDateTime now = DateTimeUtil.nowUtc();
        OffsetDateTime window = now.plusMinutes(5);

        for (GoogleCalendarConnection c : all) {
            try {
                if (c.getRefreshToken() == null)
                    continue;
                OffsetDateTime expiry = c.getTokenExpiry();
                if (expiry == null || expiry.isBefore(window)) {
                    // decrypt tokens
                    String encRefresh = c.getRefreshToken();
                    String refresh = TokenEncryptionUtil.decrypt(encRefresh, encryptionSecret);
                    String encAccess = c.getAccessToken();
                    String access = encAccess == null ? null : TokenEncryptionUtil.decrypt(encAccess, encryptionSecret);

                    Credential cred = oauthService.buildCredentialFromTokens(access, refresh, null);
                    boolean ok = cred.refreshToken();
                    if (ok) {
                        String newAccess = cred.getAccessToken();
                        Long expiresIn = cred.getExpiresInSeconds();
                        c.setAccessToken(TokenEncryptionUtil.encrypt(newAccess, encryptionSecret));
                        if (expiresIn != null)
                            c.setTokenExpiry(DateTimeUtil.nowUtc().plusSeconds(expiresIn));
                        c.setUpdatedAt(DateTimeUtil.nowUtc());
                        repo.save(c);
                    }
                }
            } catch (Exception ex) {
                // log and continue
                logger.error("Failed to refresh token for connection id={}", c.getId(), ex);
            }
        }
    }

    /**
     * Get decrypted credentials for a Google Calendar connection
     */
    public DecryptedCredentials getDecryptedCredentials(GoogleCalendarConnection connection) {
        logger.info("Decrypting credentials for connection ID: {}", connection.getId());

        String decryptedAccessToken = null;
        String decryptedRefreshToken = null;

        try {
            if (connection.getAccessToken() != null) {
                decryptedAccessToken = TokenEncryptionUtil.decrypt(connection.getAccessToken(), encryptionSecret);
                logger.info("Successfully decrypted access token");
            }

            if (connection.getRefreshToken() != null) {
                decryptedRefreshToken = TokenEncryptionUtil.decrypt(connection.getRefreshToken(), encryptionSecret);
                logger.info("Successfully decrypted refresh token");
            }

            return new DecryptedCredentials(decryptedAccessToken, decryptedRefreshToken);
        } catch (Exception e) {
            logger.error("Failed to decrypt credentials for connection ID: {}", connection.getId(), e);
            throw new RuntimeException("Failed to decrypt credentials", e);
        }
    }

    /**
     * Helper class to hold decrypted credentials
     */
    public static class DecryptedCredentials {
        private final String accessToken;
        private final String refreshToken;

        public DecryptedCredentials(String accessToken, String refreshToken) {
            this.accessToken = accessToken;
            this.refreshToken = refreshToken;
        }

        public String getAccessToken() {
            return accessToken;
        }

        public String getRefreshToken() {
            return refreshToken;
        }
    }

}
