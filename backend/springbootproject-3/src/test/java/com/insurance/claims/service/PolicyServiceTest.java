
package com.insurance.claims.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.insurance.claims.dto.PolicyRequest;
import com.insurance.claims.entity.Policy;
import com.insurance.claims.repository.PolicyRepository;

@ExtendWith(MockitoExtension.class)
class PolicyServiceTest {

    @Mock
    private PolicyRepository policyRepository;

    @InjectMocks
    private PolicyService policyService;

    private PolicyRequest request;
    private Policy policy;
    private LocalDate today;

    @BeforeEach
    void setUp() {

        today = LocalDate.now(
            ZoneId.of("America/Chicago")
        );

        request = new PolicyRequest();
        request.setPolicyNumber("POL-1001");
        request.setPolicyHolderName("John Smith");
        request.setPolicyType("HEALTH");
        request.setPremiumAmount(new BigDecimal("250.00"));
        request.setStartDate(today.plusDays(1));
        request.setEndDate(today.plusYears(1));
        request.setStatus("ACTIVE");

        policy = new Policy();
        policy.setPolicyNumber("POL-1001");
        policy.setPolicyHolderName("John Smith");
        policy.setPolicyType("HEALTH");
        policy.setPremiumAmount(new BigDecimal("250.00"));
        policy.setStartDate(request.getStartDate());
        policy.setEndDate(request.getEndDate());
        policy.setStatus("ACTIVE");
    }

    // =====================================
    // CREATE POLICY TESTS
    // =====================================

    @Test
    void shouldCreatePolicySuccessfully() {

        when(policyRepository.existsByPolicyNumberIgnoreCase("POL-1001"))
                .thenReturn(false);

        when(policyRepository.saveAndFlush(any(Policy.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        Policy result = policyService.createPolicy(request);

        assertNotNull(result);
        assertEquals("POL-1001", result.getPolicyNumber());
        assertEquals("John Smith", result.getPolicyHolderName());
        assertEquals("HEALTH", result.getPolicyType());
        assertEquals(new BigDecimal("250.00"), result.getPremiumAmount());
        assertEquals(request.getStartDate(), result.getStartDate());
        assertEquals(request.getEndDate(), result.getEndDate());
        assertEquals("ACTIVE", result.getStatus());

        verify(policyRepository).saveAndFlush(any(Policy.class));
    }

    @Test
    void shouldCreateInactivePolicySuccessfully() {

        request.setStatus("INACTIVE");

        when(policyRepository.existsByPolicyNumberIgnoreCase("POL-1001"))
                .thenReturn(false);

        when(policyRepository.saveAndFlush(any(Policy.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        Policy result = policyService.createPolicy(request);

        assertNotNull(result);
        assertEquals("INACTIVE", result.getStatus());

        verify(policyRepository).saveAndFlush(any(Policy.class));
    }

    @Test
    void shouldRejectDuplicatePolicyNumber() {

        when(policyRepository.existsByPolicyNumberIgnoreCase("POL-1001"))
                .thenReturn(true);

        ResponseStatusException exception =
                assertThrows(ResponseStatusException.class,
                        () -> policyService.createPolicy(request));

        assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
        assertEquals("Policy number already exists", exception.getReason());

        verify(policyRepository, never()).saveAndFlush(any(Policy.class));
    }

    @Test
    void shouldRejectInvalidStatusWhenCreatingPolicy() {

        request.setStatus("EXPIRED");

        ResponseStatusException exception =
                assertThrows(ResponseStatusException.class,
                        () -> policyService.createPolicy(request));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());

        assertEquals(
            "New policies must have ACTIVE or INACTIVE status",
            exception.getReason()
        );

        verifyNoInteractions(policyRepository);
    }

    @Test
    void shouldRejectCancelledStatusWhenCreatingPolicy() {

        request.setStatus("CANCELLED");

        ResponseStatusException exception =
                assertThrows(ResponseStatusException.class,
                        () -> policyService.createPolicy(request));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());

        assertEquals(
            "New policies must have ACTIVE or INACTIVE status",
            exception.getReason()
        );

        verifyNoInteractions(policyRepository);
    }

    // =====================================
    // POLICY NUMBER VALIDATION TESTS
    // =====================================

    @Test
    void shouldRejectNullPolicyNumber() {

        request.setPolicyNumber(null);

        ResponseStatusException exception =
                assertThrows(ResponseStatusException.class,
                        () -> policyService.createPolicy(request));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertEquals("Policy number is required", exception.getReason());

        verifyNoInteractions(policyRepository);
    }

    @Test
    void shouldRejectBlankPolicyNumber() {

        request.setPolicyNumber("   ");

        ResponseStatusException exception =
                assertThrows(ResponseStatusException.class,
                        () -> policyService.createPolicy(request));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertEquals("Policy number is required", exception.getReason());

        verifyNoInteractions(policyRepository);
    }

    // =====================================
    // DATE VALIDATION TESTS
    // =====================================

    @Test
    void shouldRejectNullStartDate() {

        request.setStartDate(null);

        ResponseStatusException exception =
                assertThrows(ResponseStatusException.class,
                        () -> policyService.createPolicy(request));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());

        assertEquals(
            "Start date and end date are required",
            exception.getReason()
        );

        verifyNoInteractions(policyRepository);
    }

    @Test
    void shouldRejectNullEndDate() {

        request.setEndDate(null);

        ResponseStatusException exception =
                assertThrows(ResponseStatusException.class,
                        () -> policyService.createPolicy(request));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());

        assertEquals(
            "Start date and end date are required",
            exception.getReason()
        );

        verifyNoInteractions(policyRepository);
    }

    @Test
    void shouldRejectEndDateBeforeStartDate() {

        request.setEndDate(request.getStartDate().minusDays(1));

        ResponseStatusException exception =
                assertThrows(ResponseStatusException.class,
                        () -> policyService.createPolicy(request));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());

        assertEquals(
            "End date must be after start date",
            exception.getReason()
        );

        verifyNoInteractions(policyRepository);
    }

    @Test
    void shouldRejectEqualStartAndEndDates() {

        request.setEndDate(request.getStartDate());

        ResponseStatusException exception =
                assertThrows(ResponseStatusException.class,
                        () -> policyService.createPolicy(request));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());

        assertEquals(
            "End date must be after start date",
            exception.getReason()
        );

        verifyNoInteractions(policyRepository);
    }

    @Test
    void shouldRejectExpiredActivePolicy() {

        request.setStartDate(today.minusYears(2));
        request.setEndDate(today.minusDays(1));
        request.setStatus("ACTIVE");

        ResponseStatusException exception =
                assertThrows(ResponseStatusException.class,
                        () -> policyService.createPolicy(request));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());

        assertEquals(
            "An expired policy cannot have ACTIVE status.",
            exception.getReason()
        );

        verifyNoInteractions(policyRepository);
    }

    @Test
    void shouldAllowActivePolicyEndingToday() {

        request.setStartDate(today.minusMonths(1));
        request.setEndDate(today);
        request.setStatus("ACTIVE");

        when(policyRepository.saveAndFlush(any(Policy.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        Policy result = policyService.createPolicy(request);

        assertNotNull(result);
        assertEquals(today, result.getEndDate());
        assertEquals("ACTIVE", result.getStatus());

        verify(policyRepository).saveAndFlush(any(Policy.class));
    }

    // =====================================
    // STATUS VALIDATION TESTS
    // =====================================

    @Test
    void shouldRejectNullPolicyStatus() {

        request.setStatus(null);

        ResponseStatusException exception =
                assertThrows(ResponseStatusException.class,
                        () -> policyService.createPolicy(request));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertEquals("Invalid policy status", exception.getReason());

        verifyNoInteractions(policyRepository);
    }

    @Test
    void shouldRejectUnsupportedPolicyStatus() {

        request.setStatus("UNKNOWN");

        ResponseStatusException exception =
                assertThrows(ResponseStatusException.class,
                        () -> policyService.createPolicy(request));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertEquals("Invalid policy status", exception.getReason());

        verifyNoInteractions(policyRepository);
    }

    // =====================================
    // FIELD NORMALIZATION TEST
    // =====================================

    @Test
    void shouldTrimPolicyInformation() {

        request.setPolicyNumber("  POL-1001  ");
        request.setPolicyHolderName("  John Smith  ");
        request.setPolicyType("  HEALTH  ");

        when(policyRepository.existsByPolicyNumberIgnoreCase("POL-1001"))
                .thenReturn(false);

        when(policyRepository.saveAndFlush(any(Policy.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        Policy result = policyService.createPolicy(request);

        assertEquals("POL-1001", result.getPolicyNumber());
        assertEquals("John Smith", result.getPolicyHolderName());
        assertEquals("HEALTH", result.getPolicyType());

        verify(policyRepository)
                .existsByPolicyNumberIgnoreCase("POL-1001");

        verify(policyRepository).saveAndFlush(any(Policy.class));
    }

    // =====================================
    // GET POLICY TESTS
    // =====================================

    @Test
    void shouldReturnPolicyById() {

        when(policyRepository.findById(1L))
                .thenReturn(Optional.of(policy));

        Policy result = policyService.getPolicyById(1L);

        assertEquals("POL-1001", result.getPolicyNumber());

        verify(policyRepository).findById(1L);
    }

    @Test
    void shouldReturnNotFoundForMissingPolicy() {

        when(policyRepository.findById(99L))
                .thenReturn(Optional.empty());

        ResponseStatusException exception =
                assertThrows(ResponseStatusException.class,
                        () -> policyService.getPolicyById(99L));

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());

        assertEquals(
            "Policy not found with ID: 99",
            exception.getReason()
        );
    }

    @Test
    void shouldReturnAllPolicies() {

        when(policyRepository.findAll())
                .thenReturn(List.of(policy));

        List<Policy> result = policyService.getAllPoicies();

        assertEquals(1, result.size());
        assertEquals("POL-1001", result.get(0).getPolicyNumber());

        verify(policyRepository).findAll();
    }

    // =====================================
    // UPDATE POLICY TESTS
    // =====================================

    @Test
    void shouldUpdatePolicySuccessfully() {

        when(policyRepository.findById(1L))
                .thenReturn(Optional.of(policy));

        when(policyRepository.saveAndFlush(any(Policy.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        request.setPolicyHolderName("Jane Smith");
        request.setPremiumAmount(new BigDecimal("350.00"));

        Policy result = policyService.updatePolicy(1L, request);

        assertEquals("Jane Smith", result.getPolicyHolderName());

        assertEquals(
            new BigDecimal("350.00"),
            result.getPremiumAmount()
        );

        verify(policyRepository).saveAndFlush(policy);
    }

    @Test
    void shouldRejectDuplicatePolicyNumberOnUpdate() {

        when(policyRepository.findById(1L))
                .thenReturn(Optional.of(policy));

        when(policyRepository.existsByPolicyNumberIgnoreCaseAndIdNot(
                "POL-1001", 1L))
                .thenReturn(true);

        ResponseStatusException exception =
                assertThrows(ResponseStatusException.class,
                        () -> policyService.updatePolicy(1L, request));

        assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
        assertEquals("Policy number already exists", exception.getReason());

        verify(policyRepository, never()).saveAndFlush(any(Policy.class));
    }

    @Test
    void shouldRejectUpdateForMissingPolicy() {

        when(policyRepository.findById(99L))
                .thenReturn(Optional.empty());

        ResponseStatusException exception =
                assertThrows(ResponseStatusException.class,
                        () -> policyService.updatePolicy(99L, request));

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());

        verify(policyRepository, never()).saveAndFlush(any(Policy.class));
    }

    // =====================================
    // DELETE POLICY TESTS
    // =====================================

    @Test
    void shouldDeletePolicySuccessfully() {

        when(policyRepository.findById(1L))
                .thenReturn(Optional.of(policy));

        policyService.deletePolicy(1L);

        verify(policyRepository).delete(policy);
    }

    @Test
    void shouldRejectDeleteForMissingPolicy() {

        when(policyRepository.findById(99L))
                .thenReturn(Optional.empty());

        ResponseStatusException exception =
                assertThrows(ResponseStatusException.class,
                        () -> policyService.deletePolicy(99L));

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());

        verify(policyRepository, never()).delete(any(Policy.class));
    }
}
