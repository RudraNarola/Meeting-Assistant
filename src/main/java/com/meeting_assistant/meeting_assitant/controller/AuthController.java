package com.meeting_assistant.meeting_assitant.controller;

import java.net.URI;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.meeting_assistant.meeting_assitant.service.GoogleCalendarConnectionService;
import com.meeting_assistant.meeting_assitant.service.GoogleOAuthService;

import org.springframework.web.util.UriComponentsBuilder;

@RestController
@RequestMapping("/api/auth/google")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    private final GoogleOAuthService oauthService;
    private final GoogleCalendarConnectionService connectionService;

    public AuthController(GoogleOAuthService oauthService, GoogleCalendarConnectionService connectionService) {
        this.oauthService = oauthService;
        this.connectionService = connectionService;
    }

    /**
     * Redirects user to Google consent screen. Provide optional `state` (e.g.,
     * userId) to be returned.
     */
    @GetMapping("/authorize")
    public ResponseEntity<Void> authorize(@RequestParam(required = false) String state) {
        logger.info("Initiating Google OAuth authorize, state={}", state);
        String url = oauthService.buildAuthorizationUrl(state);
        return ResponseEntity.status(302).location(URI.create(url)).build();
    }

    /**
     * OAuth2 callback. Expects `code` and optionally `state` (which we treat as
     * userId here).
     * For simplicity we accept userId via state query param or explicit `userId`
     * param.
     */
    @GetMapping("/callback")
    public ResponseEntity<String> callback(@RequestParam String code, @RequestParam(required = false) String state,
            @RequestParam(required = false) Long userId) {
        logger.info("OAuth callback received: code={}, state={}, userIdParam={}",
                code != null ? "present" : "null", state, userId);
        try {
            logger.info("Exchanging authorization code for tokens...");
            var tokenResp = oauthService.exchangeCode(code);
            logger.info("Token exchange successful");

            var credential = oauthService.buildCredentialFromTokenResponse(tokenResp);
            logger.info("Credential built from token response");

            String access = credential.getAccessToken();
            String refresh = credential.getRefreshToken();
            Long expiresIn = credential.getExpiresInSeconds();

            logger.info("OAuth tokens received - Access token: {}, Refresh token: {}, Expires in: {} seconds",
                    access != null ? "present" : "null",
                    refresh != null ? "present" : "null",
                    expiresIn);

            Long uid = userId;
            if (uid == null && state != null) {
                try {
                    uid = Long.parseLong(state);
                    logger.info("Using state as userId: {}", uid);
                } catch (Exception e) {
                    logger.warn("State is not numeric: {}", state);
                }
            }

            if (uid == null) {
                // If no userId, just return tokens to caller (developer mode). In production,
                // require user linkage.
                logger.warn("OAuth callback completed without user linkage; returning tokens to caller");
                logger.info("Returning tokens directly - Access: {}, Refresh: {}",
                        access != null ? "present" : "null",
                        refresh != null ? "present" : "null");
                return ResponseEntity.ok("accessToken=" + access + " refreshToken=" + refresh);
            }

            logger.info("Saving connection for userId: {}", uid);
            connectionService.saveOrUpdateConnection(uid, "primary", access, refresh, expiresIn);
            logger.info("Successfully saved Google connection for userId={}", uid);

            // simple redirect to a success page or return ok
            URI redirect = UriComponentsBuilder.fromUriString("/").build().toUri();
            return ResponseEntity.status(302).location(redirect).build();
        } catch (Exception ex) {
            logger.error("OAuth callback failed", ex);
            return ResponseEntity.status(500).body("OAuth callback failed: " + ex.getMessage());
        }
    }

}
