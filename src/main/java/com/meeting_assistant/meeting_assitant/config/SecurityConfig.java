package com.meeting_assistant.meeting_assitant.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers("/api/auth/**", "/oauth2/**", "/actuator/health", "/actuator/info").permitAll()
                        .requestMatchers("/api/users/**", "/api/tasks/**", "/h2-console/**").permitAll() // Allow
                                                                                                         // testing
                                                                                                         // endpoints
                        // .anyRequest().authenticated())
                        .anyRequest().permitAll())
                // .httpBasic(Customizer.withDefaults()) // Removed HTTP Basic auth for testing
                .headers(headers -> headers
                        .frameOptions(frameOptions -> frameOptions.sameOrigin())); // Allow H2 console

        return http.build();
    }

}
