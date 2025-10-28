package com.meeting_assistant.meeting_assitant.controller;

import java.time.OffsetDateTime;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.meeting_assistant.meeting_assitant.dto.UserRequest;
import com.meeting_assistant.meeting_assitant.model.User;
import com.meeting_assistant.meeting_assitant.repository.UserRepository;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private static final Logger logger = LoggerFactory.getLogger(UserController.class);

    @Autowired
    private UserRepository userRepository;

    /**
     * Create a new user for testing
     * POST /api/users
     */
    @PostMapping
    public ResponseEntity<User> createUser(@Valid @RequestBody UserRequest request) {
        logger.info("Creating user: {}", request.getEmail());

        try {
            // Check if user with email already exists
            if (userRepository.findByEmail(request.getEmail()).isPresent()) {
                logger.warn("User with email {} already exists", request.getEmail());
                return ResponseEntity.status(HttpStatus.CONFLICT).build();
            }

            User user = User.builder()
                    .username(request.getUsername())
                    .email(request.getEmail())
                    .fullName(request.getFullName())
                    .createdAt(OffsetDateTime.now())
                    .updatedAt(OffsetDateTime.now())
                    .build();

            User savedUser = userRepository.save(user);
            logger.info("User created with ID: {}", savedUser.getId());

            return ResponseEntity.status(HttpStatus.CREATED).body(savedUser);

        } catch (Exception e) {
            logger.error("Error creating user", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get all users
     * GET /api/users
     */
    @GetMapping
    public ResponseEntity<List<User>> getAllUsers() {
        logger.info("Fetching all users");

        try {
            List<User> users = userRepository.findAll();
            return ResponseEntity.ok(users);
        } catch (Exception e) {
            logger.error("Error fetching users", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get user by ID
     * GET /api/users/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable Long id) {
        logger.info("Fetching user by ID: {}", id);

        try {
            return userRepository.findById(id)
                    .map(user -> ResponseEntity.ok(user))
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            logger.error("Error fetching user", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Create a default test user
     * POST /api/users/test
     */
    @PostMapping("/test")
    public ResponseEntity<User> createTestUser() {
        logger.info("Creating default test user");

        try {
            String testEmail = "test@example.com";

            // Check if test user already exists
            if (userRepository.findByEmail(testEmail).isPresent()) {
                logger.info("Test user already exists");
                User existingUser = userRepository.findByEmail(testEmail).get();
                return ResponseEntity.ok(existingUser);
            }

            User testUser = User.builder()
                    .username("testuser")
                    .email(testEmail)
                    .fullName("Test User")
                    .createdAt(OffsetDateTime.now())
                    .updatedAt(OffsetDateTime.now())
                    .build();

            User savedUser = userRepository.save(testUser);
            logger.info("Test user created with ID: {}", savedUser.getId());

            return ResponseEntity.status(HttpStatus.CREATED).body(savedUser);

        } catch (Exception e) {
            logger.error("Error creating test user", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}