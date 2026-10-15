package com.itsm.security;

import com.itsm.model.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

/**
 * Creates the JWT "access token" a user receives after logging in.
 * The token is signed with a secret key, contains the username and role, and expires after a few hours.
 * The frontend sends it back in every request:  Authorization: Bearer &lt;token&gt;
 */
@Service
public class JwtService {

    public static final String ROLES_CLAIM = "roles";

    private final JwtEncoder encoder;
    private final Clock clock;
    private final Duration validity;

    public JwtService(JwtEncoder encoder, Clock clock,
                      @Value("${itsm.security.token-validity-hours:8}") long validityHours) {
        this.encoder = encoder;
        this.clock = clock;
        this.validity = Duration.ofHours(validityHours);
    }

    public IssuedToken issue(User user) {
        Instant now = Instant.now(clock);
        Instant expiresAt = now.plus(validity);
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("i-itsm")
                .subject(user.getUsername())
                .issuedAt(now)
                .expiresAt(expiresAt)
                .claim(ROLES_CLAIM, List.of(user.getRole().name()))
                .claim("name", user.getFullName())
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        String token = encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
        return new IssuedToken(token, expiresAt);
    }

    public record IssuedToken(String value, Instant expiresAt) {
    }
}
