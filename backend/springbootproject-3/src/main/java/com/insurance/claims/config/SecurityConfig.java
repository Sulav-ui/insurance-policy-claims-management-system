
package com.insurance.claims.config;

import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;

import jakarta.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;

import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import org.springframework.security.web.SecurityFilterChain;

import com.nimbusds.jose.jwk.source.ImmutableSecret;

import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtValidators;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    // =====================================
    // PASSWORD ENCODER
    // =====================================

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // =====================================
    // JWT DECODER
    // =====================================

    @Bean
    public JwtDecoder jwtDecoder(
            @Value("${app.jwt.secret}") String secret) {

        byte[] key = Base64.getDecoder().decode(secret);

        if (key.length < 32) {
            throw new IllegalArgumentException(
                "JWT secret must contain at least 32 bytes"
            );
        }

        SecretKeySpec secretKey =
            new SecretKeySpec(key, "HmacSHA256");

        NimbusJwtDecoder decoder = NimbusJwtDecoder
            .withSecretKey(secretKey)
            .macAlgorithm(MacAlgorithm.HS256)
            .build();

        // Validate issuer and standard JWT timestamps
        OAuth2TokenValidator<Jwt> validator =
            JwtValidators.createDefaultWithIssuer(
                "insurance-claims-backend"
            );

        decoder.setJwtValidator(validator);

        return decoder;
    }

    // =====================================
    // JWT ENCODER
    // =====================================

    @Bean
    public JwtEncoder jwtEncoder(
            @Value("${app.jwt.secret}") String secret) {

        byte[] key = Base64.getDecoder().decode(secret);

        if (key.length < 32) {
            throw new IllegalArgumentException(
                "JWT secret must contain at least 32 bytes"
            );
        }

        return new NimbusJwtEncoder(
            new ImmutableSecret<>(key)
        );
    }

    // =====================================
    // SECURITY FILTER CHAIN
    // =====================================

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http) throws Exception {

        http

            // Disable CSRF for stateless Bearer-token API
            .csrf(csrf -> csrf.disable())

            // No server-side HTTP session
            .sessionManagement(session ->
                session.sessionCreationPolicy(
                    SessionCreationPolicy.STATELESS
                )
            )

            // =====================================
            // AUTHORIZATION RULES
            // =====================================

            .authorizeHttpRequests(auth -> auth

                // Public authentication endpoints
                .requestMatchers("/api/auth/**")
                    .permitAll()

                // USER and ADMIN can view dashboard
                .requestMatchers(
                    HttpMethod.GET,
                    "/api/dashboard/summary"
                )
                    .hasAnyAuthority(
                        "SCOPE_USER",
                        "SCOPE_ADMIN"
                    )

                // USER and ADMIN can view policies
                .requestMatchers(
                    HttpMethod.GET,
                    "/api/policies/**"
                )
                    .hasAnyAuthority(
                        "SCOPE_USER",
                        "SCOPE_ADMIN"
                    )

                // USER and ADMIN can view claims
                .requestMatchers(
                    HttpMethod.GET,
                    "/api/claims/**"
                )
                    .hasAnyAuthority(
                        "SCOPE_USER",
                        "SCOPE_ADMIN"
                    )

                // Only ADMIN can modify policies
                .requestMatchers("/api/policies/**")
                    .hasAuthority("SCOPE_ADMIN")

                // Only ADMIN can modify claims
                .requestMatchers("/api/claims/**")
                    .hasAuthority("SCOPE_ADMIN")

                // All other endpoints require authentication
                .anyRequest()
                    .authenticated()
            )

            // =====================================
            // CUSTOM ERROR RESPONSES
            // =====================================

            .exceptionHandling(exceptions -> exceptions

                // 401 - Unauthenticated
                .authenticationEntryPoint(
                    (request, response, authException) -> {

                        response.setStatus(
                            HttpServletResponse.SC_UNAUTHORIZED
                        );

                        response.setContentType(
                            MediaType.APPLICATION_JSON_VALUE
                        );

                        response.setCharacterEncoding("UTF-8");

                        response.getWriter().write(
                            "{\"message\":\"Authentication required or token invalid or expired\"}"
                        );
                    }
                )

                // 403 - Forbidden
                .accessDeniedHandler(
                    (request, response, accessDeniedException) -> {

                        response.setStatus(
                            HttpServletResponse.SC_FORBIDDEN
                        );

                        response.setContentType(
                            MediaType.APPLICATION_JSON_VALUE
                        );

                        response.setCharacterEncoding("UTF-8");

                        response.getWriter().write(
                            "{\"message\":\"Access denied. You do not have permission.\"}"
                        );
                    }
                )
            )

            // =====================================
            // JWT RESOURCE SERVER
            // =====================================

            .oauth2ResourceServer(oauth2 ->
                oauth2.jwt(Customizer.withDefaults())
            );

        return http.build();
    }
}
