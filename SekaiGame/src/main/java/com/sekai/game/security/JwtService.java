package com.sekai.game.security;

import com.sekai.game.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Date;
import java.util.Optional;

@Component
public class JwtService {

    public static final String COOKIE_NAME = "sekai_access";

    private final SecretKey signingKey;
    private final long expirationMillis;
    private final boolean secureCookie;
    private final String adminUsername;

    public JwtService(
        @Value("${app.jwt.secret}") String secret,
        @Value("${app.jwt.expiration}") long expirationMillis,
        @Value("${app.jwt.cookie-secure:false}") boolean secureCookie,
        @Value("${app.security.admin-username:}") String adminUsername
    ) {
        if (secret == null || secret.isBlank() || secret.length() < 32) {
            throw new IllegalStateException("APP_JWT_SECRET must contain at least 32 characters");
        }
        if (expirationMillis <= 0) {
            throw new IllegalStateException("app.jwt.expiration must be positive");
        }
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMillis = expirationMillis;
        this.secureCookie = secureCookie;
        this.adminUsername = adminUsername == null ? "" : adminUsername.trim();
    }

    public String issue(User user) {
        Date now = new Date();
        return Jwts.builder()
            .subject(String.valueOf(user.getId()))
            .claim("username", user.getUsername())
            .claim("role", isAdmin(user.getUsername()) ? "ADMIN" : "USER")
            .issuedAt(now)
            .expiration(new Date(now.getTime() + expirationMillis))
            .signWith(signingKey)
            .compact();
    }

    public Optional<Claims> parse(String token) {
        if (token == null || token.isBlank()) return Optional.empty();
        try {
            return Optional.of(Jwts.parser().verifyWith(signingKey).build().parseSignedClaims(token).getPayload());
        } catch (RuntimeException ignored) {
            return Optional.empty();
        }
    }

    public ResponseCookie accessCookie(String token) {
        return ResponseCookie.from(COOKIE_NAME, token)
            .httpOnly(true)
            .secure(secureCookie)
            .sameSite("Strict")
            .path("/")
            .maxAge(Duration.ofMillis(expirationMillis))
            .build();
    }

    public ResponseCookie clearAccessCookie() {
        return ResponseCookie.from(COOKIE_NAME, "")
            .httpOnly(true)
            .secure(secureCookie)
            .sameSite("Strict")
            .path("/")
            .maxAge(Duration.ZERO)
            .build();
    }

    public boolean isAdmin(String username) {
        return !adminUsername.isBlank() && adminUsername.equals(username);
    }
}
