
package com.insurance.claims.controller;

import com.insurance.claims.dto.DashboardSummary;
import com.insurance.claims.service.DashboardService;
import com.insurance.claims.config.SecurityConfig;

import java.math.BigDecimal;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;

import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;

import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(
	    controllers = DashboardController.class,
	    properties = {
	        "app.jwt.secret=VGhpcy1pcy1hLXRlc3Qtc2VjcmV0LXdpdGgtMzItYnl0ZXMtbWluaW11bQ=="
	    }
	)
@Import(SecurityConfig.class)
class DashboardSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DashboardService dashboardService;

    @BeforeEach
    void setup() {

        DashboardSummary summary = new DashboardSummary(
                8L,
                8L,
                10L,
                0L,
                new BigDecimal("5300.00")
        );

        when(dashboardService.getDashboardSummary())
                .thenReturn(summary);
    }

    // TEST 1: No JWT should return 401
    @Test
    void shouldRejectRequestWithoutJwt() throws Exception {

        mockMvc.perform(
                get("/api/dashboard/summary")
        )
        .andExpect(status().isUnauthorized());
    }

    // TEST 2: ADMIN should access dashboard
    @Test
    void shouldAllowAdminToAccessDashboard() throws Exception {

        mockMvc.perform(
                get("/api/dashboard/summary")
                    .with(
                        SecurityMockMvcRequestPostProcessors.jwt()
                            .authorities(
                                new org.springframework.security.core.authority.SimpleGrantedAuthority(
                                    "SCOPE_ADMIN"
                                )
                            )
                    )
        )
        .andExpect(status().isOk());
    }

    // TEST 3: USER should access dashboard
    @Test
    void shouldAllowUserToAccessDashboard() throws Exception {

        mockMvc.perform(
                get("/api/dashboard/summary")
                    .with(
                        SecurityMockMvcRequestPostProcessors.jwt()
                            .authorities(
                                new org.springframework.security.core.authority.SimpleGrantedAuthority(
                                    "SCOPE_USER"
                                )
                            )
                    )
        )
        .andExpect(status().isOk());
    }

    // TEST 4: Verify JSON response
    @Test
    void shouldReturnCorrectDashboardJson() throws Exception {

        mockMvc.perform(
                get("/api/dashboard/summary")
                    .with(
                        SecurityMockMvcRequestPostProcessors.jwt()
                            .authorities(
                                new org.springframework.security.core.authority.SimpleGrantedAuthority(
                                    "SCOPE_ADMIN"
                                )
                            )
                    )
                    .accept(MediaType.APPLICATION_JSON)
        )
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalPolicies").value(8))
        .andExpect(jsonPath("$.activePolicies").value(8))
        .andExpect(jsonPath("$.totalClaims").value(10))
        .andExpect(jsonPath("$.pendingClaims").value(0))
        .andExpect(jsonPath("$.totalClaimAmount").value(5300.00));
    }
}
