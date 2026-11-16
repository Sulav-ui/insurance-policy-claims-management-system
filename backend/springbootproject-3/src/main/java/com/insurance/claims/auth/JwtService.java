
package com.insurance.claims.auth;

import java.time.Instant;
import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private final JwtEncoder jwtEncoder;
    private final Duration tokenExpiration;

    public JwtService(
            JwtEncoder jwtEncoder,
            @Value("${app.jwt.expiration-minutes:60}")
            long expirationMinutes
    ) {
        if (expirationMinutes <= 0) {
            throw new IllegalArgumentException(
                "JWT expiration must be greater than zero"
            );
        }

        this.jwtEncoder = jwtEncoder;
        this.tokenExpiration =
            Duration.ofMinutes(expirationMinutes);
    }

    // =====================================
    // GENERATE JWT TOKEN
    // =====================================

    public String generateToken(AppUser user) {

        Instant now = Instant.now();

        JwtClaimsSet claims = JwtClaimsSet.builder()

                // Token issuer
                .issuer("insurance-claims-backend")

                // Token creation time
                .issuedAt(now)

                // Token expiration time
                .expiresAt(now.plus(tokenExpiration))

                // Authenticated user identity
                .subject(user.getEmail())

                // USER or ADMIN authorization scope
                .claim("scope", user.getRole().name())

                .build();

        // HS256 signing algorithm
        JwsHeader header =
            JwsHeader.with(MacAlgorithm.HS256)
                .build();

        return jwtEncoder.encode(
            JwtEncoderParameters.from(
                header,
                claims
            )
        ).getTokenValue();
    }
}
