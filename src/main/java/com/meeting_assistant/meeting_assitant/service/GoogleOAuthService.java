package com.meeting_assistant.meeting_assitant.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.auth.oauth2.TokenResponse;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeRequestUrl;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeTokenRequest;
import com.google.api.client.googleapis.auth.oauth2.GoogleTokenResponse;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.auth.oauth2.BearerToken;
import com.google.api.client.auth.oauth2.ClientParametersAuthentication;

@Service
public class GoogleOAuthService {

    private static final Logger logger = LoggerFactory.getLogger(GoogleOAuthService.class);

    private final NetHttpTransport transport;
    private final JsonFactory jsonFactory;
    private final String clientId;
    private final String clientSecret;
    private final String redirectUri;
    private final List<String> scopes;

    public GoogleOAuthService(NetHttpTransport transport, JsonFactory jsonFactory,
            @Value("${google.client-id:}") String clientId,
            @Value("${google.client-secret:}") String clientSecret,
            @Value("${google.redirect-uri:http://localhost:8080/oauth2/callback/google}") String redirectUri,
            @Value("${google.scopes:}") String scopesCsv) {
        this.transport = transport;
        this.jsonFactory = jsonFactory;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.redirectUri = redirectUri;
        if (scopesCsv == null || scopesCsv.isBlank()) {
            this.scopes = List.of("https://www.googleapis.com/auth/calendar");
        } else {
            this.scopes = List.of(scopesCsv.split(","));
        }
    }

    /**
     * Build the authorization URL to redirect the user to Google's consent screen.
     */
    public String buildAuthorizationUrl(String state) {
        logger.info("Building Google authorization URL, state={}", state);
        GoogleAuthorizationCodeRequestUrl url = new GoogleAuthorizationCodeRequestUrl(clientId, redirectUri, scopes);
        url.setAccessType("offline");
        url.setApprovalPrompt("force"); // Force consent to get refresh token
        if (state != null)
            url.setState(state);
        String built = url.build();
        logger.debug("Authorization URL built: {}", built);
        return built;
    }

    /**
     * Exchange authorization code for tokens using the modern Google token request.
     */
    public GoogleTokenResponse exchangeCode(String code) throws Exception {
        logger.info("Exchanging authorization code for tokens, code: {}", code != null ? "present" : "null");
        GoogleAuthorizationCodeTokenRequest tokenRequest = new GoogleAuthorizationCodeTokenRequest(
                transport, jsonFactory, clientId, clientSecret, code, redirectUri);
        GoogleTokenResponse tokenResponse = tokenRequest.execute();
        logger.info("Token exchange successful - Access token: {}, Refresh token: {}, Expires in: {} seconds",
                tokenResponse.getAccessToken() != null ? "present" : "null",
                tokenResponse.getRefreshToken() != null ? "present" : "null",
                tokenResponse.getExpiresInSeconds());
        return tokenResponse;
    }

    /**
     * Build a Credential object from a TokenResponse (access + refresh tokens).
     */
    public Credential buildCredentialFromTokenResponse(TokenResponse tokenResponse) {
        logger.debug("Building Credential from TokenResponse (hasAccess={}, hasRefresh={})",
                tokenResponse.getAccessToken() != null, tokenResponse.getRefreshToken() != null);
        Credential credential = new Credential.Builder(BearerToken.authorizationHeaderAccessMethod())
                .setTransport(transport)
                .setJsonFactory(jsonFactory)
                .setTokenServerEncodedUrl("https://oauth2.googleapis.com/token")
                .setClientAuthentication(new ClientParametersAuthentication(clientId, clientSecret))
                .build();
        credential.setFromTokenResponse(tokenResponse);
        return credential;
    }

    /**
     * Build a Credential object directly from access and refresh token strings.
     */
    public Credential buildCredentialFromTokens(String accessToken, String refreshToken, Long expiresInSeconds) {
        logger.info("Building credential from tokens - Access token: {}, Refresh token: {}, Expires in: {} seconds",
                accessToken != null ? "present" : "null",
                refreshToken != null ? "present" : "null",
                expiresInSeconds);

        TokenResponse tr = new TokenResponse();
        tr.setAccessToken(accessToken);
        tr.setRefreshToken(refreshToken);
        if (expiresInSeconds != null)
            tr.setExpiresInSeconds(expiresInSeconds);

        Credential credential = buildCredentialFromTokenResponse(tr);
        logger.info("Credential built successfully - Access token set: {}",
                credential.getAccessToken() != null ? "yes" : "no");
        return credential;
    }

    public List<String> getScopes() {
        return scopes;
    }

}
