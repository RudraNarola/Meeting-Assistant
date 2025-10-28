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
        User user = userRepo.findById(userId).orElseGet(() -> {
            User u = User.builder().username("user" + userId).email("user" + userId + "@local").build();
            return userRepo.save(u);
        });

        GoogleCalendarConnection conn = new GoogleCalendarConnection();
        conn.setUser(user);
        conn.setCalendarId(calendarId == null ? "primary" : calendarId);
        if (accessToken != null)
            conn.setAccessToken(TokenEncryptionUtil.encrypt(accessToken, encryptionSecret));
        if (refreshToken != null)
            conn.setRefreshToken(TokenEncryptionUtil.encrypt(refreshToken, encryptionSecret));
        if (expiresInSeconds != null)
            conn.setTokenExpiry(DateTimeUtil.nowUtc().plusSeconds(expiresInSeconds));
        conn.setCreatedAt(DateTimeUtil.nowUtc());
        conn.setUpdatedAt(DateTimeUtil.nowUtc());
        return repo.save(conn);
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

}
