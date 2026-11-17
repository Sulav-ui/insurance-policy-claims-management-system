
package com.insurance.claims.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.Optional;

import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.jayway.jsonpath.JsonPath;
import com.insurance.claims.config.SecurityConfig;

@WebMvcTest(
    controllers = AuthController.class,
    properties = {
        "app.jwt.secret=VGhpcy1pcy1hLXRlc3Qtc2VjcmV0LXdpdGgtMzItYnl0ZXMtbWluaW11bQ==",
        "app.jwt.expiration-minutes=60"
    }
)
@Import({
    SecurityConfig.class,
    JwtService.class
})
class AuthIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

 

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtDecoder jwtDecoder;

    @MockitoBean
    private UserRepository userRepository;

    private AppUser createUser(Role role) {

        AppUser user = new AppUser();

        user.setFullName("John Smith");
        user.setEmail("john@example.com");
        user.setPassword(
            passwordEncoder.encode("Password123!")
        );
        user.setRole(role);

        return user;
    }

    private String registerJson() {
        return """
            {
                "fullName": "John Smith",
                "email": "John@Example.com",
                "password": "Password123!"
            }
            """;
    }

    private String loginJson(String email, String password) {

        return """
            {
                "email": "%s",
                "password": "%s"
            }
            """.formatted(email, password);
    }

    // =====================================
    // REGISTRATION TESTS
    // =====================================

    @Test
    void shouldRegisterUserSuccessfully() throws Exception {

        when(userRepository.save(any(AppUser.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

        String response = mockMvc.perform(
                post("/api/auth/register")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(registerJson())
            )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.tokenType").value("Bearer"))
            .andExpect(jsonPath("$.role").value("USER"))
            .andExpect(jsonPath("$.email").value("john@example.com"))
            .andReturn()
            .getResponse()
            .getContentAsString();

        String token = JsonPath.read(response, "$.token");

        Jwt decoded = jwtDecoder.decode(token);

        assertEquals(
        	    "insurance-claims-backend",
        	    decoded.getClaimAsString("iss")
        	);

        assertEquals("john@example.com", decoded.getSubject());
        assertEquals("USER", decoded.getClaimAsString("scope"));

        assertNotNull(decoded.getIssuedAt());
        assertNotNull(decoded.getExpiresAt());

        verify(userRepository).save(
            argThat(user ->
                user.getRole() == Role.USER
                && user.getEmail().equals("john@example.com")
                && passwordEncoder.matches(
                    "Password123!",
                    user.getPassword()
                )
            )
        );
    }

    @Test
    void shouldRejectDuplicateEmail() throws Exception {

        when(userRepository.existsByEmail("john@example.com"))
            .thenReturn(true);

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(registerJson()))
            .andExpect(status().isConflict());

        verify(userRepository, never()).save(any(AppUser.class));
    }

    @Test
    void shouldRejectInvalidRegistrationEmail() throws Exception {

        String json = """
            {
                "fullName": "John Smith",
                "email": "invalid-email",
                "password": "Password123!"
            }
            """;

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
            .andExpect(status().isBadRequest());

        verify(userRepository, never()).save(any(AppUser.class));
    }

    @Test
    void shouldRejectShortRegistrationPassword() throws Exception {

        String json = """
            {
                "fullName": "John Smith",
                "email": "john@example.com",
                "password": "123"
            }
            """;

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
            .andExpect(status().isBadRequest());

        verify(userRepository, never()).save(any(AppUser.class));
    }

    @Test
    void shouldPreventPublicAdminRegistration() throws Exception {

        when(userRepository.save(any(AppUser.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

        String json = """
            {
                "fullName": "John Smith",
                "email": "john@example.com",
                "password": "Password123!",
                "role": "ADMIN"
            }
            """;

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.role").value("USER"));

        verify(userRepository).save(
            argThat(user -> user.getRole() == Role.USER)
        );
    }

    // =====================================
    // LOGIN TESTS
    // =====================================

    @Test
    void shouldLoginSuccessfully() throws Exception {

        AppUser user = createUser(Role.USER);

        when(userRepository.findByEmail("john@example.com"))
            .thenReturn(Optional.of(user));

        String response = mockMvc.perform(
                post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(loginJson(
                        "john@example.com",
                        "Password123!"
                    ))
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.tokenType").value("Bearer"))
            .andExpect(jsonPath("$.role").value("USER"))
            .andReturn()
            .getResponse()
            .getContentAsString();

        String token = JsonPath.read(response, "$.token");

        Jwt decoded = jwtDecoder.decode(token);

        assertEquals("john@example.com", decoded.getSubject());
        assertEquals("USER", decoded.getClaimAsString("scope"));
    }

    @Test
    void shouldRejectIncorrectPassword() throws Exception {

        AppUser user = createUser(Role.USER);

        when(userRepository.findByEmail("john@example.com"))
            .thenReturn(Optional.of(user));

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginJson(
                    "john@example.com",
                    "WrongPassword"
                )))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldRejectUnknownEmail() throws Exception {

        when(userRepository.findByEmail("unknown@example.com"))
            .thenReturn(Optional.empty());

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginJson(
                    "unknown@example.com",
                    "Password123!"
                )))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldRejectBlankLoginCredentials() throws Exception {

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "email": "",
                        "password": ""
                    }
                    """))
            .andExpect(status().isBadRequest());
    }

    @Test
    void shouldNormalizeLoginEmailToLowercase() throws Exception {

        AppUser user = createUser(Role.USER);

        when(userRepository.findByEmail("john@example.com"))
            .thenReturn(Optional.of(user));

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginJson(
                    "JOHN@EXAMPLE.COM",
                    "Password123!"
                )))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email")
                .value("john@example.com"));

        verify(userRepository)
            .findByEmail("john@example.com");
    }
}
