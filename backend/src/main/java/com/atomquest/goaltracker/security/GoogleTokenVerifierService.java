package com.atomquest.goaltracker.security;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.atomquest.goaltracker.config.AppProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Collections;

/**
 * Verifies Google ID tokens (issued by Google Sign-In / One Tap).
 * <p>
 * Requires google-api-client on the classpath (added to pom.xml).
 */
@Service
@Slf4j
public class GoogleTokenVerifierService {

    private final GoogleIdTokenVerifier verifier;

    public GoogleTokenVerifierService(AppProperties props) {
        this.verifier = new GoogleIdTokenVerifier.Builder(
                new NetHttpTransport(),
                GsonFactory.getDefaultInstance())
                .setAudience(Collections.singletonList(props.getGoogleClientId()))
                .build();
    }

    /**
     * Verifies the raw ID token string and returns the parsed token,
     * or {@code null} if verification fails.
     */
    public GoogleIdToken verify(String idTokenString) {
        try {
            return verifier.verify(idTokenString);
        } catch (GeneralSecurityException | IOException | IllegalArgumentException e) {
            log.warn("Google ID token verification failed: {}", e.getMessage());
            return null;
        }
    }
}