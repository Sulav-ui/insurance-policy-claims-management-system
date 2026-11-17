
package com.insurance.claims.scheduler;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.time.LocalDate;
import java.time.ZoneId;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.insurance.claims.repository.PolicyRepository;

@ExtendWith(MockitoExtension.class)
class PolicyExpirationSchedulerTest {

    @Mock
    private PolicyRepository policyRepository;

    @InjectMocks
    private PolicyExpirationScheduler scheduler;

    private LocalDate today;

    @BeforeEach
    void setUp() {

        today = LocalDate.now(
            ZoneId.of("America/Chicago")
        );
    }

    // =====================================
    // 1. EXPIRE MULTIPLE POLICIES
    // =====================================

    @Test
    void shouldExpireMultiplePolicies() {

        when(policyRepository.expireActivePolicies(today))
                .thenReturn(5);

        assertDoesNotThrow(() ->
            scheduler.expirePolicies()
        );

        verify(policyRepository, times(1))
                .expireActivePolicies(today);
    }

    // =====================================
    // 2. NO EXPIRED POLICIES
    // =====================================

    @Test
    void shouldHandleNoExpiredPolicies() {

        when(policyRepository.expireActivePolicies(today))
                .thenReturn(0);

        assertDoesNotThrow(() ->
            scheduler.expirePolicies()
        );

        verify(policyRepository, times(1))
                .expireActivePolicies(today);
    }

    // =====================================
    // 3. EXPIRE A SINGLE POLICY
    // =====================================

    @Test
    void shouldExpireSinglePolicy() {

        when(policyRepository.expireActivePolicies(today))
                .thenReturn(1);

        assertDoesNotThrow(() ->
            scheduler.expirePolicies()
        );

        verify(policyRepository, times(1))
                .expireActivePolicies(today);
    }

    // =====================================
    // 4. DATABASE FAILURE
    // =====================================

    @Test
    void shouldPropagateRepositoryException() {

        when(policyRepository.expireActivePolicies(today))
                .thenThrow(
                    new RuntimeException("Database unavailable")
                );

        RuntimeException exception =
                assertThrows(
                    RuntimeException.class,
                    () -> scheduler.expirePolicies()
                );

        assertEquals(
            "Database unavailable",
            exception.getMessage()
        );

        verify(policyRepository, times(1))
                .expireActivePolicies(today);
    }

    // =====================================
    // 5. REPEATED SCHEDULER EXECUTION
    // =====================================

    @Test
    void shouldSupportRepeatedExecution() {

        when(policyRepository.expireActivePolicies(today))
                .thenReturn(3, 0);

        scheduler.expirePolicies();
        scheduler.expirePolicies();

        verify(policyRepository, times(2))
                .expireActivePolicies(today);
    }
}
