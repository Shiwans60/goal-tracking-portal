package com.atomquest.goaltracker.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app")
@Getter
@Setter
public class AppProperties {

    private Jwt jwt = new Jwt();
    private String frontendUrl = "http://localhost:4200";
    private String mailFrom = "noreply@company.com";
    private String corsAllowedOrigins = "http://localhost:4200";

    @Getter
    @Setter
    public static class Jwt {
        private String secret;
        private long expiryMs = 86_400_000L;
    }
}
