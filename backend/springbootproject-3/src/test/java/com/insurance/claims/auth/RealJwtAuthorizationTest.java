
package com.insurance.claims.auth;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.insurance.claims.config.SecurityConfig;
import com.insurance.claims.controller.ClaimController;
import com.insurance.claims.dto.ClaimRequest;
import com.insurance.claims.service.ClaimService;

@WebMvcTest(
    controllers = ClaimController.class,
    properties = {
        "app.jwt.secret=VGhpcy1pcy1hLXRlc3Qtc2VjcmV0LXdpdGgtMzItYnl0ZXMtbWluaW11bQ==",
        "app.jwt.expiration-minutes=60"
    }
)
@Import({
    SecurityConfig.class,
    JwtService.class
})
class RealJwtAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @MockitoBean
    private ClaimService claimService;

    private String userToken;
    private String adminToken;
    private String validClaimJson;

    @BeforeEach
    void setUp() {

        AppUser user = new AppUser();
        user.setEmail("user@example.com");
        user.setRole(Role.USER);

        AppUser admin = new AppUser();
        admin.setEmail("admin@example.com");
        admin.setRole(Role.ADMIN);

        userToken = jwtService.generateToken(user);
        adminToken = jwtService.generateToken(admin);

        validClaimJson = """
            {
                "claimNumber": "CLM-2001",
                "claimAmount": 1200.00,
                "claimDate": "2026-01-15",
                "description": "Vehicle repair",
                "status": "PENDING",
                "policyId": 1
            }
            """;
    }

    // =====================================
    // REAL JWT - GET REQUESTS
    // =====================================

    @Test
    void validUserTokenCanGetClaims() throws Exception {

        when(claimService.getAllClaims())
            .thenReturn(List.of());

        mockMvc.perform(get("/api/claims")
                .header("Authorization", "Bearer " + userToken))
            .andExpect(status().isOk())
            .andExpect(content().json("[]"));

        verify(claimService).getAllClaims();
    }

    @Test
    void validAdminTokenCanGetClaims() throws Exception {

        when(claimService.getAllClaims())
            .thenReturn(List.of());

        mockMvc.perform(get("/api/claims")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk());

        verify(claimService).getAllClaims();
    }

    @Test
    void missingTokenCannotGetClaims() throws Exception {

        mockMvc.perform(get("/api/claims"))
            .andExpect(status().isUnauthorized());

        verifyNoInteractions(claimService);
    }

    @Test
    void invalidTokenCannotGetClaims() throws Exception {

        mockMvc.perform(get("/api/claims")
                .header("Authorization", "Bearer invalid.jwt.token"))
            .andExpect(status().isUnauthorized());

        verifyNoInteractions(claimService);
    }

    // =====================================
    // REAL JWT - ROLE AUTHORIZATION
    // =====================================

    @Test
    void userTokenCannotCreateClaim() throws Exception {

        mockMvc.perform(post("/api/claims")
                .header("Authorization", "Bearer " + userToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(validClaimJson))
            .andExpect(status().isForbidden());

        verify(claimService, never())
            .createClaim(any(ClaimRequest.class));
    }

    @Test
    void adminTokenCanCreateClaim() throws Exception {

        mockMvc.perform(post("/api/claims")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(validClaimJson))
            .andExpect(status().isCreated());

        verify(claimService).createClaim(
            any(ClaimRequest.class)
        );
    }

    @Test
    void userTokenCannotDeleteClaim() throws Exception {

        mockMvc.perform(delete("/api/claims/10")
                .header("Authorization", "Bearer " + userToken))
            .andExpect(status().isForbidden());

        verify(claimService, never()).deleteClaim(10L);
    }

    @Test
    void adminTokenCanDeleteClaim() throws Exception {

        mockMvc.perform(delete("/api/claims/10")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isNoContent());

        verify(claimService).deleteClaim(10L);
    }
}
