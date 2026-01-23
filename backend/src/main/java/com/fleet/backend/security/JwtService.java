package com.fleet.backend.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.util.Date;
import java.nio.charset.StandardCharsets;


public JwtService(
        @Value("${security.jwt.secret:}") String secret,
        @Value("${security.jwt.exp-minutes:120}") long expMinutes
) {
    if (secret == null || secret.isBlank()) {
        throw new IllegalStateException("Missing security.jwt.secret (set SECURITY.JWT_SECRET in Railway service variables)");
    }
    byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
    if (bytes.length < 32) {
        throw new IllegalStateException("JWT secret too short: need at least 32 bytes (256 bits)");
    }
    this.key = Keys.hmacShaKeyFor(bytes);
    this.expMinutes = expMinutes;
}