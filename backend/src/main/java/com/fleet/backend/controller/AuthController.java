package com.fleet.backend.controller;

import com.fleet.backend.repository.UserRepository;
import com.fleet.backend.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.authentication.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final AuthenticationManager authManager;
    private final JwtService jwtService;
    private final UserRepository userRepo;

    public AuthController(AuthenticationManager authManager, JwtService jwtService, UserRepository userRepo) {
        this.authManager = authManager;
        this.jwtService = jwtService;
        this.userRepo = userRepo;
    }

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");

        if (username == null || password == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "username and password are required");
        }

        try {
            authManager.authenticate(
                    new UsernamePasswordAuthenticationToken(username, password)
            );
        } catch (AuthenticationException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        var user = userRepo.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        String token = jwtService.generateToken(user.getUsername(), user.getRole().name());

        return Map.of(
                "token", token,
                "username", user.getUsername(),
                "role", user.getRole().name()
        );
    }
}
