//
//package com.insurance.claims.config;
//
//import static org.junit.jupiter.api.Assertions.*;
//
//import java.time.Instant;
//import java.time.temporal.ChronoUnit;
//import java.util.Base64;
//
//import javax.crypto.spec.SecretKeySpec;
//
//import org.junit.jupiter.api.Test;
//
//import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
//import org.springframework.security.oauth2.jwt.*;
//
//import com.nimbusds.jose.jwk.source.ImmutableSecret;
//
//class JwtIssuerValidationTest {
//
//    private static final String EXPECTED_ISSUER =
//            "insurance-claims-backend";
//
//    @Test
//    void validIssuerShouldBeAccepted() {
//
//        JwtDecoder decoder = createDecoder();
//
//        String token = createToken(
//                "insurance-claims-backend"
//        );
//
//        Jwt jwt = decoder.decode(token);
//
//        assertEquals(
//                EXPECTED_ISSUER,
//                jwt.getIssuer().toString()
//        );
//
//        System.out.println(
//            "PASS: Valid JWT issuer accepted"
//        );
//    }
//
//    @Test
//    void invalidIssuerShouldBeRejected() {
//
//        JwtDecoder decoder = createDecoder();
//
//        String token = createToken(
//                "fake-insurance-backend"
//        );
//
//        assertThrows(
//                JwtException.class,
//                () -> decoder.decode(token)
//        );
//
//        System.out.println(
//            "PASS: Invalid JWT issuer rejected"
//        );
//    }
//
//    // Create a test decoder using production configuration
//    private JwtDecoder createDecoder() {
//
//        String secret = generateTestSecret();
//
//        SecurityConfig config = new SecurityConfig();
//
//        return config.jwtDecoder(secret);
//    }
//
//    // Generate a correctly signed test token
//    private String createToken(String issuer) {
//
//        String secret = generateTestSecret();
//
//        byte[] key = Base64.getDecoder().decode(secret);
//
//        JwtEncoder encoder = new NimbusJwtEncoder(
//                new ImmutableSecret<>(key)
//        );
//
//        Instant now = Instant.now();
//
//        JwtClaimsSet claims = JwtClaimsSet.builder()
//                .issuer(issuer)
//                .issuedAt(now)
//                .expiresAt(
//                    now.plus(1, ChronoUnit.HOURS)
//                )
//                .subject("test@example.com")
//                .claim("scope", "ADMIN")
//                .build();
//
//        JwsHeader header = JwsHeader
//                .with(MacAlgorithm.HS256)
//                .build();
//
//        return encoder.encode(
//                JwtEncoderParameters.from(
//                    header,
//                    claims
//                )
//        ).getTokenValue();
//    }
//
//    // Fixed key used only for isolated unit testing
//    private String generateTestSecret() {
//
//        byte[] key = new byte[32];
//
//        for (int i = 0; i < key.length; i++) {
//            key[i] = (byte) (i + 1);
//        }
//
//        return Base64.getEncoder()
//                .encodeToString(key);
//    }
//}
