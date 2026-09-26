package com.econext.notification.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;

@Component
@Slf4j
public class JwtTokenProvider {

    private final SecretKey secretKey;

    public JwtTokenProvider(@Value("${app.jwt.secret:404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970}") String secret) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser().verifyWith(secretKey).build().parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException ex) {
            log.warn("Invalid JWT token: {}", ex.getMessage());
            return false;
        }
    }

    public UserPrincipal getUserPrincipal(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        Long userId = null;
        Object userIdClaim = claims.get("user_id");
        if (userIdClaim instanceof Number) {
            userId = ((Number) userIdClaim).longValue();
        } else if (userIdClaim instanceof String) {
            userId = Long.parseLong((String) userIdClaim);
        } else if (claims.getSubject() != null) {
            try {
                userId = Long.parseLong(claims.getSubject());
            } catch (NumberFormatException ignored) {}
        }

        String username = claims.get("username", String.class);
        if (username == null) {
            username = claims.getSubject();
        }

        String role = claims.get("role", String.class);
        if (role == null) {
            role = "USER";
        }

        return UserPrincipal.builder()
                .id(userId != null ? userId : 1L)
                .username(username)
                .role(role)
                .build();
    }
}
