package com.meetingassistant.controller;

import com.meetingassistant.dto.AuthRequest;
import com.meetingassistant.dto.AuthResponse;
import com.meetingassistant.model.Role;
import com.meetingassistant.model.User;
import com.meetingassistant.security.JwtUtil;
import com.meetingassistant.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    public AuthController(UserService userService, AuthenticationManager authenticationManager, JwtUtil jwtUtil) {
        this.userService = userService;
        this.authenticationManager = authenticationManager;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody AuthRequest req) {
        Role role = Role.ROLE_USER;
        if (req.getRole() != null && req.getRole().equals(Role.ROLE_ADMIN.name())) role = Role.ROLE_ADMIN;
        User user = userService.register(req.getUsername(), req.getPassword(), role);
        return ResponseEntity.ok().body("registered");
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest req) {
        log.info("Login attempt for username={}", req.getUsername());
        try {
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(req.getUsername(), req.getPassword()));
            String token = jwtUtil.generateToken(req.getUsername());
            log.info("Login success for username={}", req.getUsername());
            return ResponseEntity.ok(new AuthResponse(token));
        } catch (org.springframework.security.core.AuthenticationException ex) {
            log.warn("Login failed for username={}: {}", req.getUsername(), ex.getMessage());
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).body("Invalid credentials");
        }
    }
}
