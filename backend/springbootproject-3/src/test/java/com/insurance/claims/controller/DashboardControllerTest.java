
package com.insurance.claims.controller;

import com.insurance.claims.dto.DashboardSummary;
import com.insurance.claims.service.DashboardService;

import org.junit.jupiter.api.Test;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class DashboardControllerTest {

    @Test
    void shouldReturnDashboardSummaryWithHttp200() {

        // Arrange
        DashboardService dashboardService =
                mock(DashboardService.class);

        DashboardSummary expected =
                new DashboardSummary(
                        8L,
                        8L,
                        10L,
                        0L,
                        new BigDecimal("5300.00")
                );

        when(dashboardService.getDashboardSummary())
                .thenReturn(expected);

        DashboardController controller =
                new DashboardController(dashboardService);

        // Act
        ResponseEntity<DashboardSummary> response =
                controller.getSummary();

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());

        assertNotNull(response.getBody());

        assertEquals(8L, response.getBody().totalPolicies());
        assertEquals(8L, response.getBody().activePolicies());
        assertEquals(10L, response.getBody().totalClaims());
        assertEquals(0L, response.getBody().pendingClaims());

        assertEquals(
                0,
                new BigDecimal("5300.00").compareTo(
                        response.getBody().totalClaimAmount()
                )
        );

        verify(dashboardService).getDashboardSummary();
    }
}
