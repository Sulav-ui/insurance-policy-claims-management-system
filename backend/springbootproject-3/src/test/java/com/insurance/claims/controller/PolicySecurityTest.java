
package com.insurance.claims.controller;

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
import com.insurance.claims.dto.PolicyRequest;
import com.insurance.claims.entity.Policy;
import com.insurance.claims.service.PolicyService;

@WebMvcTest(
    controllers = PolicyContoller.class,
    properties = {
        "app.jwt.secret=VGhpcy1pcy1hLXRlc3Qtc2VjcmV0LXdpdGgtMzItYnl0ZXMtbWluaW11bQ=="
    }
)
@Import(SecurityConfig.class)
class PolicySecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PolicyService policyService;

    private Policy policy;
    private String validRequestJson;

    @BeforeEach
    void setUp() {

        policy = new Policy();
        policy.setPolicyNumber("POL-1001");
        policy.setPolicyHolderName("John Smith");
        policy.setPolicyType("HEALTH");
        policy.setPremiumAmount(new BigDecimal("250.00"));
        policy.setStartDate(LocalDate.now().plusDays(1));
        policy.setEndDate(LocalDate.now().plusYears(1));
        policy.setStatus("ACTIVE");

        validRequestJson = """
            {
                "policyNumber": "POL-1001",
                "policyHolderName": "John Smith",
                "policyType": "HEALTH",
                "premiumAmount": 250.00,
                "startDate": "%s",
                "endDate": "%s",
                "status": "ACTIVE"
            }
            """.formatted(
                LocalDate.now().plusDays(1),
                LocalDate.now().plusYears(1)
            );
    }

    // No JWT -> 401
    @Test
    void shouldRejectUnauthenticatedGet() throws Exception {

        mockMvc.perform(get("/api/policies"))
            .andExpect(status().isUnauthorized());
    }

    // USER can read
    @Test
    void userCanGetPolicies() throws Exception {

        when(policyService.getAllPoicies())
            .thenReturn(List.of(policy));

        mockMvc.perform(get("/api/policies")
                .with(jwt().authorities(
                    new SimpleGrantedAuthority("SCOPE_USER")
                )))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].policyNumber")
                .value("POL-1001"));
    }

    // ADMIN can read
    @Test
    void adminCanGetPolicies() throws Exception {

        when(policyService.getAllPoicies())
            .thenReturn(List.of(policy));

        mockMvc.perform(get("/api/policies")
                .with(jwt().authorities(
                    new SimpleGrantedAuthority("SCOPE_ADMIN")
                )))
            .andExpect(status().isOk());
    }

    // USER cannot create
    @Test
    void userCannotCreatePolicy() throws Exception {

        mockMvc.perform(post("/api/policies")
                .with(jwt().authorities(
                    new SimpleGrantedAuthority("SCOPE_USER")
                ))
                .contentType(MediaType.APPLICATION_JSON)
                .content(validRequestJson))
            .andExpect(status().isForbidden());

        verify(policyService, never())
            .createPolicy(any(PolicyRequest.class));
    }

    // ADMIN can create
    @Test
    void adminCanCreatePolicy() throws Exception {

        when(policyService.createPolicy(any(PolicyRequest.class)))
            .thenReturn(policy);

        mockMvc.perform(post("/api/policies")
                .with(jwt().authorities(
                    new SimpleGrantedAuthority("SCOPE_ADMIN")
                ))
                .contentType(MediaType.APPLICATION_JSON)
                .content(validRequestJson))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.policyNumber")
                .value("POL-1001"));
    }

    // Invalid request -> 400
    @Test
    void adminCannotCreateInvalidPolicy() throws Exception {

        String invalidJson = """
            {
                "policyNumber": "",
                "policyHolderName": "",
                "policyType": "",
                "premiumAmount": -100,
                "startDate": null,
                "endDate": null,
                "status": "UNKNOWN"
            }
            """;

        mockMvc.perform(post("/api/policies")
                .with(jwt().authorities(
                    new SimpleGrantedAuthority("SCOPE_ADMIN")
                ))
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidJson))
            .andExpect(status().isBadRequest());

        verify(policyService, never())
            .createPolicy(any(PolicyRequest.class));
    }

    // USER cannot delete
    @Test
    void userCannotDeletePolicy() throws Exception {

        mockMvc.perform(delete("/api/policies/1")
                .with(jwt().authorities(
                    new SimpleGrantedAuthority("SCOPE_USER")
                )))
            .andExpect(status().isForbidden());

        verify(policyService, never()).deletePolicy(anyLong());
    }

    // ADMIN can delete
    @Test
    void adminCanDeletePolicy() throws Exception {

        mockMvc.perform(delete("/api/policies/1")
                .with(jwt().authorities(
                    new SimpleGrantedAuthority("SCOPE_ADMIN")
                )))
            .andExpect(status().isNoContent());

        verify(policyService).deletePolicy(1L);
    }
}
