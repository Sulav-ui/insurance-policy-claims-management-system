
package com.insurance.claims.controller;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.insurance.claims.config.SecurityConfig;
import com.insurance.claims.dto.ClaimRequest;
import com.insurance.claims.dto.ClaimResponse;
import com.insurance.claims.service.ClaimService;

@WebMvcTest(
    controllers = ClaimController.class,
    properties = {
        "app.jwt.secret=VGhpcy1pcy1hLXRlc3Qtc2VjcmV0LXdpdGgtMzItYnl0ZXMtbWluaW11bQ=="
    }
)
@Import(SecurityConfig.class)
class ClaimSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ClaimService claimService;

    private String validRequestJson;

    private ClaimResponse claimResponse;

    @BeforeEach
    void setUp() {

        LocalDate today = LocalDate.now();

        validRequestJson = """
            {
                "claimNumber": "CLM-1001",
                "claimAmount": 1500.00,
                "claimDate": "%s",
                "description": "Vehicle repair expenses",
                "status": "PENDING",
                "policyId": 1
            }
            """.formatted(today);

        claimResponse = new ClaimResponse(
            10L,
            "CLM-1001",
            new BigDecimal("1500.00"),
            today,
            "Vehicle repair expenses",
            "PENDING",
            1L
        );
    }

    private SimpleGrantedAuthority userAuthority() {
        return new SimpleGrantedAuthority("SCOPE_USER");
    }

    private SimpleGrantedAuthority adminAuthority() {
        return new SimpleGrantedAuthority("SCOPE_ADMIN");
    }

    // =====================================
    // GET CLAIMS
    // =====================================

    @Test
    void unauthenticatedCannotGetClaims() throws Exception {

        mockMvc.perform(get("/api/claims"))
            .andExpect(status().isUnauthorized());

        verifyNoInteractions(claimService);
    }

    @Test
    void userCanGetClaims() throws Exception {

        when(claimService.getAllClaims())
            .thenReturn(List.of(claimResponse));

        mockMvc.perform(get("/api/claims")
                .with(jwt().authorities(userAuthority())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].claimNumber")
                .value("CLM-1001"));

        verify(claimService).getAllClaims();
    }

    @Test
    void adminCanGetClaims() throws Exception {

        when(claimService.getAllClaims())
            .thenReturn(List.of(claimResponse));

        mockMvc.perform(get("/api/claims")
                .with(jwt().authorities(adminAuthority())))
            .andExpect(status().isOk());

        verify(claimService).getAllClaims();
    }

    @Test
    void userCanGetClaimById() throws Exception {

        when(claimService.getClaimById(10L))
            .thenReturn(claimResponse);

        mockMvc.perform(get("/api/claims/10")
                .with(jwt().authorities(userAuthority())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.claimNumber")
                .value("CLM-1001"));

        verify(claimService).getClaimById(10L);
    }

    // =====================================
    // CREATE CLAIMS
    // =====================================

    @Test
    void unauthenticatedCannotCreateClaim() throws Exception {

        mockMvc.perform(post("/api/claims")
                .contentType(MediaType.APPLICATION_JSON)
                .content(validRequestJson))
            .andExpect(status().isUnauthorized());

        verifyNoInteractions(claimService);
    }

    @Test
    void userCannotCreateClaim() throws Exception {

        mockMvc.perform(post("/api/claims")
                .with(jwt().authorities(userAuthority()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(validRequestJson))
            .andExpect(status().isForbidden());

        verify(claimService, never())
            .createClaim(any(ClaimRequest.class));
    }

    @Test
    void adminCanCreateClaim() throws Exception {

        mockMvc.perform(post("/api/claims")
                .with(jwt().authorities(adminAuthority()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(validRequestJson))
            .andExpect(status().isCreated())
            .andExpect(content().string(""));

        verify(claimService).createClaim(
            any(ClaimRequest.class)
        );
    }

    @Test
    void adminCannotCreateInvalidClaim() throws Exception {

        String invalidJson = """
            {
                "claimNumber": "",
                "claimAmount": -100,
                "claimDate": null,
                "description": "",
                "status": "INVALID",
                "policyId": null
            }
            """;

        mockMvc.perform(post("/api/claims")
                .with(jwt().authorities(adminAuthority()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidJson))
            .andExpect(status().isBadRequest());

        verify(claimService, never())
            .createClaim(any(ClaimRequest.class));
    }

    // =====================================
    // UPDATE CLAIMS
    // =====================================

    @Test
    void userCannotUpdateClaim() throws Exception {

        mockMvc.perform(put("/api/claims/10")
                .with(jwt().authorities(userAuthority()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(validRequestJson))
            .andExpect(status().isForbidden());

        verify(claimService, never())
            .updateClaim(anyLong(), any(ClaimRequest.class));
    }

    @Test
    void adminCanUpdateClaim() throws Exception {

        when(claimService.updateClaim(
                eq(10L), any(ClaimRequest.class)))
            .thenReturn(claimResponse);

        mockMvc.perform(put("/api/claims/10")
                .with(jwt().authorities(adminAuthority()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(validRequestJson))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.claimNumber")
                .value("CLM-1001"));

        verify(claimService).updateClaim(
            eq(10L), any(ClaimRequest.class)
        );
    }

    // =====================================
    // DELETE CLAIMS
    // =====================================

    @Test
    void userCannotDeleteClaim() throws Exception {

        mockMvc.perform(delete("/api/claims/10")
                .with(jwt().authorities(userAuthority())))
            .andExpect(status().isForbidden());

        verify(claimService, never())
            .deleteClaim(anyLong());
    }

    @Test
    void adminCanDeleteClaim() throws Exception {

        mockMvc.perform(delete("/api/claims/10")
                .with(jwt().authorities(adminAuthority())))
            .andExpect(status().isNoContent());

        verify(claimService).deleteClaim(10L);
    }

    // =====================================
    // CLAIM STATUS HISTORY
    // =====================================

    @Test
    void unauthenticatedCannotGetClaimHistory() throws Exception {

        mockMvc.perform(get("/api/claims/10/history"))
            .andExpect(status().isUnauthorized());

        verifyNoInteractions(claimService);
    }

    @Test
    void userCanGetClaimHistory() throws Exception {

        when(claimService.getClaimHistory(10L))
            .thenReturn(List.of());

        mockMvc.perform(get("/api/claims/10/history")
                .with(jwt().authorities(userAuthority())))
            .andExpect(status().isOk())
            .andExpect(content().json("[]"));

        verify(claimService).getClaimHistory(10L);
    }

    @Test
    void adminCanGetClaimHistory() throws Exception {

        when(claimService.getClaimHistory(10L))
            .thenReturn(List.of());

        mockMvc.perform(get("/api/claims/10/history")
                .with(jwt().authorities(adminAuthority())))
            .andExpect(status().isOk())
            .andExpect(content().json("[]"));

        verify(claimService).getClaimHistory(10L);
    }
}
