package com.meetingassistant.controller;

import com.meetingassistant.dto.UserDTO;
import com.meetingassistant.model.User;
import com.meetingassistant.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    public ResponseEntity<UserDTO> me(Authentication auth) {
        String username = auth.getName();
        User user = userService.findByUsername(username).orElseThrow();
        return ResponseEntity.ok(new UserDTO(user.getId(), user.getUsername(), user.getRole()));
    }

    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @GetMapping("/{username}")
    public ResponseEntity<UserDTO> getByUsername(@PathVariable String username) {
        User user = userService.findByUsername(username).orElseThrow();
        return ResponseEntity.ok(new UserDTO(user.getId(), user.getUsername(), user.getRole()));
    }
}
