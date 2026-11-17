
package com.insurance.claims.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.math.BigDecimal;
import java.time.LocalDate;
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

import com.insurance.claims.dto.ClaimRequest;
import com.insurance.claims.dto.ClaimResponse;
import com.insurance.claims.entity.Claim;
import com.insurance.claims.entity.ClaimStatusHistory;
import com.insurance.claims.entity.Policy;
import com.insurance.claims.repository.ClaimRepository;
import com.insurance.claims.repository.ClaimStatusHistoryRepository;
import com.insurance.claims.repository.PolicyRepository;

@ExtendWith(MockitoExtension.class)
class ClaimServiceTest {

    @Mock
    private ClaimRepository claimRepository;

    @Mock
    private PolicyRepository policyRepository;

    @Mock
    private ClaimStatusHistoryRepository historyRepository;

    @InjectMocks
    private ClaimService claimService;

    private ClaimRequest request;
    private Policy policy;
    private Claim claim;

    @BeforeEach
    void setUp() {

        LocalDate today = LocalDate.now();

        request = new ClaimRequest();
        request.setClaimNumber("CLM-1001");
        request.setClaimAmount(new BigDecimal("1500.00"));
        request.setClaimDate(today);
        request.setDescription("Vehicle repair expenses");
        request.setStatus("PENDING");
        request.setPolicyId(1L);

        policy = new Policy();
        policy.setId(1L);
        policy.setStatus("ACTIVE");
        policy.setStartDate(today.minusYears(1));
        policy.setEndDate(today.plusYears(1));

        claim = new Claim();
        claim.setId(10L);
        claim.setClaimNumber("CLM-1001");
        claim.setClaimAmount(new BigDecimal("1500.00"));
        claim.setClaimDate(today);
        claim.setDescription("Vehicle repair expenses");
        claim.setStatus("PENDING");
        claim.setPolicy(policy);
    }

    private void mockPolicyLookup() {
        when(policyRepository.findById(1L))
            .thenReturn(Optional.of(policy));
    }

    private void mockClaimLookup() {
        when(claimRepository.findById(10L))
            .thenReturn(Optional.of(claim));
    }

    private void mockClaimSave() {
        when(claimRepository.saveAndFlush(any(Claim.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void shouldCreateClaimSuccessfully() {

        mockPolicyLookup();
        mockClaimSave();

        Claim result = claimService.createClaim(request);

        assertNotNull(result);
        assertEquals("CLM-1001", result.getClaimNumber());
        assertEquals("PENDING", result.getStatus());
        assertSame(policy, result.getPolicy());

        verify(claimRepository).saveAndFlush(any(Claim.class));
    }

    @Test
    void shouldRejectDuplicateClaimNumber() {

        when(claimRepository.existsByClaimNumberIgnoreCase("CLM-1001"))
            .thenReturn(true);

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> claimService.createClaim(request)
        );

        assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
        verify(claimRepository, never()).saveAndFlush(any(Claim.class));
    }

    @Test
    void shouldRejectInvalidClaimAmount() {

        request.setClaimAmount(new BigDecimal("-100.00"));

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> claimService.createClaim(request)
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
    }

    @Test
    void shouldRejectFutureClaimDate() {

        request.setClaimDate(LocalDate.now().plusDays(1));

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> claimService.createClaim(request)
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
    }

    @Test
    void shouldRejectInactivePolicy() {

        policy.setStatus("INACTIVE");
        mockPolicyLookup();

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> claimService.createClaim(request)
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
    }

    @Test
    void shouldRejectClaimOutsidePolicyCoverage() {

        policy.setStartDate(LocalDate.now().plusDays(1));
        mockPolicyLookup();

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> claimService.createClaim(request)
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
    }

    @Test
    void shouldRejectNewClaimWithApprovedStatus() {

        request.setStatus("APPROVED");
        mockPolicyLookup();

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> claimService.createClaim(request)
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
    }

    @Test
    void shouldReturnClaimById() {

        mockClaimLookup();

        ClaimResponse result = claimService.getClaimById(10L);

        assertNotNull(result);
        verify(claimRepository).findById(10L);
    }

    @Test
    void shouldRejectMissingClaim() {

        when(claimRepository.findById(99L))
            .thenReturn(Optional.empty());

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> claimService.getClaimById(99L)
        );

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
    }

    @Test
    void shouldReturnAllClaims() {

        when(claimRepository.findAll())
            .thenReturn(List.of(claim));

        List<ClaimResponse> result = claimService.getAllClaims();

        assertEquals(1, result.size());
        verify(claimRepository).findAll();
    }

    @Test
    void shouldUpdatePendingClaimSuccessfully() {

        mockClaimLookup();
        mockPolicyLookup();
        mockClaimSave();

        request.setDescription("Updated repair expenses");

        ClaimResponse result = claimService.updateClaim(10L, request);

        assertNotNull(result);
        assertEquals("Updated repair expenses", claim.getDescription());

        verify(claimRepository).saveAndFlush(claim);
        verify(historyRepository, never())
            .saveAndFlush(any(ClaimStatusHistory.class));
    }

    @Test
    void shouldApprovePendingClaimAndRecordHistory() {

        mockClaimLookup();
        mockPolicyLookup();
        mockClaimSave();

        request.setStatus("APPROVED");

        ClaimResponse result = claimService.updateClaim(10L, request);

        assertNotNull(result);
        assertEquals("APPROVED", claim.getStatus());

        verify(historyRepository).saveAndFlush(
            argThat(history ->
                "PENDING".equals(history.getPreviousStatus())
                && "APPROVED".equals(history.getNewStatus())
            )
        );
    }

    @Test
    void shouldRejectChangingApprovedClaimStatus() {

        claim.setStatus("APPROVED");
        request.setStatus("REJECTED");

        mockClaimLookup();
        mockPolicyLookup();

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> claimService.updateClaim(10L, request)
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());

        verify(claimRepository, never()).saveAndFlush(any(Claim.class));
    }

    @Test
    void shouldRejectDuplicateClaimNumberOnUpdate() {

        mockClaimLookup();

        when(claimRepository.existsByClaimNumberIgnoreCaseAndIdNot(
                "CLM-1001", 10L))
            .thenReturn(true);

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> claimService.updateClaim(10L, request)
        );

        assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
    }

    @Test
    void shouldReturnNotFoundForMissingClaimHistory() {

        when(claimRepository.existsById(99L))
            .thenReturn(false);

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> claimService.getClaimHistory(99L)
        );

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
    }

    @Test
    void shouldReturnEmptyHistoryForExistingClaim() {

        when(claimRepository.existsById(10L))
            .thenReturn(true);

        when(historyRepository.findByClaim_IdOrderByChangedAtDescIdDesc(10L))
            .thenReturn(List.of());

        assertTrue(claimService.getClaimHistory(10L).isEmpty());
    }

    @Test
    void shouldDeleteClaimSuccessfully() {

        mockClaimLookup();

        when(historyRepository.findByClaim_IdOrderByChangedAtDescIdDesc(10L))
            .thenReturn(List.of());

        claimService.deleteClaim(10L);

        var order = inOrder(historyRepository, claimRepository);

        order.verify(historyRepository).findByClaim_IdOrderByChangedAtDescIdDesc(10L);
        order.verify(historyRepository).deleteAll(anyList());
        order.verify(historyRepository).flush();
        order.verify(claimRepository).delete(claim);
    }

    @Test
    void shouldRejectDeletingMissingClaim() {

        when(claimRepository.findById(99L))
            .thenReturn(Optional.empty());

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> claimService.deleteClaim(99L)
        );

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());

        verify(claimRepository, never()).delete(any(Claim.class));
    }
 // =========================================
 // ADDITIONAL CLAIM VALIDATION TESTS
 // =========================================

 private void assertBadRequest() {

     ResponseStatusException exception = assertThrows(
         ResponseStatusException.class,
         () -> claimService.createClaim(request)
     );

     assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());

     verify(claimRepository, never())
         .saveAndFlush(any(Claim.class));
 }

 @Test
 void shouldRejectNullClaimRequest() {

     ResponseStatusException exception = assertThrows(
         ResponseStatusException.class,
         () -> claimService.createClaim(null)
     );

     assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
 }

 @Test
 void shouldRejectNullClaimNumber() {
     request.setClaimNumber(null);
     assertBadRequest();
 }

 @Test
 void shouldRejectBlankClaimNumber() {
     request.setClaimNumber("   ");
     assertBadRequest();
 }

 @Test
 void shouldRejectShortClaimNumber() {
     request.setClaimNumber("AB");
     assertBadRequest();
 }

 @Test
 void shouldRejectLongClaimNumber() {
     request.setClaimNumber("A".repeat(51));
     assertBadRequest();
 }

 @Test
 void shouldRejectNullClaimAmount() {
     request.setClaimAmount(null);
     assertBadRequest();
 }

 @Test
 void shouldRejectZeroClaimAmount() {
     request.setClaimAmount(BigDecimal.ZERO);
     assertBadRequest();
 }

 @Test
 void shouldRejectClaimAmountWithTooManyDecimalPlaces() {
     request.setClaimAmount(new BigDecimal("1500.123"));
     assertBadRequest();
 }

 @Test
 void shouldRejectClaimAmountWithTooManyIntegerDigits() {
     request.setClaimAmount(new BigDecimal("12345678901234.00"));
     assertBadRequest();
 }

 @Test
 void shouldRejectNullClaimDate() {
     request.setClaimDate(null);
     assertBadRequest();
 }

 @Test
 void shouldRejectNullDescription() {
     request.setDescription(null);
     assertBadRequest();
 }

 @Test
 void shouldRejectBlankDescription() {
     request.setDescription("   ");
     assertBadRequest();
 }

 @Test
 void shouldRejectLongDescription() {
     request.setDescription("A".repeat(1001));
     assertBadRequest();
 }

 @Test
 void shouldRejectNullStatus() {
     request.setStatus(null);
     assertBadRequest();
 }

 @Test
 void shouldRejectInvalidStatus() {
     request.setStatus("PROCESSING");
     assertBadRequest();
 }

 @Test
 void shouldRejectNullPolicyId() {
     request.setPolicyId(null);
     assertBadRequest();
 }

 @Test
 void shouldRejectZeroPolicyId() {
     request.setPolicyId(0L);
     assertBadRequest();
 }

 @Test
 void shouldRejectNegativePolicyId() {
     request.setPolicyId(-1L);
     assertBadRequest();
 }

 // =========================================
 // ADDITIONAL POLICY ELIGIBILITY TESTS
 // =========================================

 @Test
 void shouldRejectMissingPolicy() {

     when(policyRepository.findById(1L))
         .thenReturn(Optional.empty());

     ResponseStatusException exception = assertThrows(
         ResponseStatusException.class,
         () -> claimService.createClaim(request)
     );

     assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
 }

 @Test
 void shouldRejectClaimAfterPolicyEndDate() {

     policy.setEndDate(LocalDate.now().minusDays(1));

     mockPolicyLookup();

     assertBadRequest();
 }

 @Test
 void shouldRejectNewClaimWithRejectedStatus() {

     request.setStatus("REJECTED");

     mockPolicyLookup();

     assertBadRequest();
 }

 // =========================================
 // ADDITIONAL CLAIM UPDATE TESTS
 // =========================================

 @Test
 void shouldRejectUpdatingMissingClaim() {

     when(claimRepository.findById(99L))
         .thenReturn(Optional.empty());

     ResponseStatusException exception = assertThrows(
         ResponseStatusException.class,
         () -> claimService.updateClaim(99L, request)
     );

     assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
 }

 @Test
 void shouldUpdateAssociatedPolicySuccessfully() {

     Policy newPolicy = new Policy();

     newPolicy.setId(2L);
     newPolicy.setStatus("ACTIVE");
     newPolicy.setStartDate(LocalDate.now().minusYears(1));
     newPolicy.setEndDate(LocalDate.now().plusYears(1));

     request.setPolicyId(2L);

     mockClaimLookup();
     mockClaimSave();

     when(policyRepository.findById(2L))
         .thenReturn(Optional.of(newPolicy));

     ClaimResponse result = claimService.updateClaim(10L, request);

     assertNotNull(result);
     assertSame(newPolicy, claim.getPolicy());

     verify(claimRepository).saveAndFlush(claim);
 }

 @Test
 void shouldUpdateClaimDateSuccessfully() {

     LocalDate newDate = LocalDate.now().minusDays(5);

     request.setClaimDate(newDate);

     mockClaimLookup();
     mockPolicyLookup();
     mockClaimSave();

     ClaimResponse result = claimService.updateClaim(10L, request);

     assertNotNull(result);
     assertEquals(newDate, claim.getClaimDate());

     verify(claimRepository).saveAndFlush(claim);
 }

 @Test
 void shouldRejectPendingClaimAndRecordHistory() {

     request.setStatus("REJECTED");

     mockClaimLookup();
     mockPolicyLookup();
     mockClaimSave();

     ClaimResponse result = claimService.updateClaim(10L, request);

     assertNotNull(result);
     assertEquals("REJECTED", claim.getStatus());

     verify(historyRepository).saveAndFlush(
         argThat(history ->
             "PENDING".equals(history.getPreviousStatus())
             && "REJECTED".equals(history.getNewStatus())
         )
     );
 }

 @Test
 void shouldUpdateApprovedClaimWithoutChangingStatus() {

     claim.setStatus("APPROVED");
     request.setStatus("APPROVED");
     request.setDescription("Updated description");

     mockClaimLookup();
     mockPolicyLookup();
     mockClaimSave();

     ClaimResponse result = claimService.updateClaim(10L, request);

     assertNotNull(result);
     assertEquals("APPROVED", claim.getStatus());
     assertEquals("Updated description", claim.getDescription());

     verify(historyRepository, never())
         .saveAndFlush(any(ClaimStatusHistory.class));
 }

 // =========================================
 // ADDITIONAL CLAIM HISTORY TESTS
 // =========================================

 @Test
 void shouldReturnClaimStatusHistory() {

     ClaimStatusHistory history = new ClaimStatusHistory(
         claim,
         "PENDING",
         "APPROVED"
     );

     when(claimRepository.existsById(10L))
         .thenReturn(true);

     when(historyRepository
         .findByClaim_IdOrderByChangedAtDescIdDesc(10L))
         .thenReturn(List.of(history));

     var result = claimService.getClaimHistory(10L);

     assertNotNull(result);
     assertEquals(1, result.size());

     verify(historyRepository)
         .findByClaim_IdOrderByChangedAtDescIdDesc(10L);
 }

 // =========================================
 // ADDITIONAL CLAIM RETRIEVAL TESTS
 // =========================================

 @Test
 void shouldReturnEmptyClaimList() {

     when(claimRepository.findAll())
         .thenReturn(List.of());

     assertTrue(claimService.getAllClaims().isEmpty());
 }
}
