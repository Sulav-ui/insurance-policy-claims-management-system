
package com.insurance.claims.service;

import com.insurance.claims.dto.DashboardSummary;
import com.insurance.claims.repository.PolicyRepository;
import com.insurance.claims.repository.ClaimRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    private PolicyRepository policyRepository;

    @Mock
    private ClaimRepository claimRepository;

    @InjectMocks
    private DashboardService dashboardService;

    @Test
    void shouldReturnCorrectDashboardSummary() {

        // Arrange: Mock database results
        when(policyRepository.count()).thenReturn(8L);

        when(policyRepository.countByStatus("ACTIVE"))
                .thenReturn(8L);

        when(claimRepository.count()).thenReturn(10L);

        when(claimRepository.countByStatus("PENDING"))
                .thenReturn(0L);

        when(claimRepository.calculateTotalClaimAmount())
                .thenReturn(new BigDecimal("5300.00"));

        // Act: Call the service
        DashboardSummary summary =
                dashboardService.getDashboardSummary();

        // Assert: Verify calculated values
        assertNotNull(summary);

        assertEquals(8L, summary.totalPolicies());
        assertEquals(8L, summary.activePolicies());
        assertEquals(10L, summary.totalClaims());
        assertEquals(0L, summary.pendingClaims());

        assertEquals(
                0,
                new BigDecimal("5300.00")
                        .compareTo(summary.totalClaimAmount())
        );

        // Verify repository methods were called
        verify(policyRepository).count();

        verify(policyRepository)
                .countByStatus("ACTIVE");

        verify(claimRepository).count();

        verify(claimRepository)
                .countByStatus("PENDING");

        verify(claimRepository)
                .calculateTotalClaimAmount();
    }

    @Test
    void shouldReturnZeroWhenDatabaseIsEmpty() {

        // Arrange
        when(policyRepository.count()).thenReturn(0L);

        when(policyRepository.countByStatus("ACTIVE"))
                .thenReturn(0L);

        when(claimRepository.count()).thenReturn(0L);

        when(claimRepository.countByStatus("PENDING"))
                .thenReturn(0L);

        when(claimRepository.calculateTotalClaimAmount())
                .thenReturn(BigDecimal.ZERO);

        // Act
        DashboardSummary summary =
                dashboardService.getDashboardSummary();

        // Assert
        assertEquals(0L, summary.totalPolicies());
        assertEquals(0L, summary.activePolicies());
        assertEquals(0L, summary.totalClaims());
        assertEquals(0L, summary.pendingClaims());

        assertEquals(
                0,
                BigDecimal.ZERO.compareTo(
                        summary.totalClaimAmount()
                )
        );
    }
}
