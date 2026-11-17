
package com.insurance.claims.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.insurance.claims.dto.ClaimRequest;
import com.insurance.claims.dto.ClaimResponse;
import com.insurance.claims.entity.Claim;
import com.insurance.claims.entity.ClaimStatusHistory;
import com.insurance.claims.entity.Policy;
import com.insurance.claims.repository.ClaimRepository;
import com.insurance.claims.repository.ClaimStatusHistoryRepository;
import com.insurance.claims.repository.PolicyRepository;
import com.insurance.claims.dto.ClaimStatusHistoryResponse;

@Service
public class ClaimService {

    private final ClaimRepository claimRepository;
    private final PolicyRepository policyRepository;
    private final ClaimStatusHistoryRepository historyRepository;

    public ClaimService(
            ClaimRepository claimRepository,
            PolicyRepository policyRepository,
            ClaimStatusHistoryRepository historyRepository) {

        this.claimRepository = claimRepository;
        this.policyRepository = policyRepository;
        this.historyRepository = historyRepository;
    }

    // =========================================
    // VALIDATE CLAIM REQUEST
    // =========================================

    private void validateClaimRequest(ClaimRequest request) {

        if (request == null) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Claim request is required."
            );
        }

        if (request.getClaimNumber() == null ||
                request.getClaimNumber().trim().isEmpty()) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Claim number is required."
            );
        }

        if (request.getClaimNumber().trim().length() < 3 ||
                request.getClaimNumber().trim().length() > 50) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Claim number must contain between 3 and 50 characters."
            );
        }

        if (request.getClaimAmount() == null ||
                request.getClaimAmount()
                    .compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Claim amount must be greater than zero."
            );
        }

        if (request.getClaimAmount().scale() > 2 ||
                request.getClaimAmount().precision()
                    - request.getClaimAmount().scale() > 13) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Claim amount must fit within 13 integer digits and 2 decimal places."
            );
        }

        if (request.getClaimDate() == null) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Claim date is required."
            );
        }

        if (request.getClaimDate().isAfter(LocalDate.now())) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Claim date cannot be in the future."
            );
        }

        if (request.getDescription() == null ||
                request.getDescription().trim().isEmpty()) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Claim description is required."
            );
        }

        if (request.getDescription().length() > 1000) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Description cannot exceed 1000 characters."
            );
        }

        if (request.getStatus() == null ||
                !List.of(
                    "PENDING",
                    "APPROVED",
                    "REJECTED"
                ).contains(request.getStatus())) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Status must be PENDING, APPROVED, or REJECTED."
            );
        }

        if (request.getPolicyId() == null ||
                request.getPolicyId() <= 0) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Please select a valid policy."
            );
        }
    }

    // =========================================
    // VALIDATE POLICY ELIGIBILITY
    // =========================================

    private void validatePolicyEligibility(
            Policy policy,
            LocalDate claimDate) {

        if (!"ACTIVE".equalsIgnoreCase(policy.getStatus())) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Claims can only be submitted for ACTIVE policies."
            );
        }

        if (claimDate.isBefore(policy.getStartDate())) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Claim date cannot be before the policy start date."
            );
        }

        if (claimDate.isAfter(policy.getEndDate())) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Claim date cannot be after the policy end date."
            );
        }
    }

    // =========================================
    // FIND POLICY
    // =========================================

    private Policy findPolicy(Long policyId) {

        return policyRepository.findById(policyId)
            .orElseThrow(() ->
                new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Policy not found with ID: " + policyId
                )
            );
    }

    // =========================================
    // CREATE CLAIM
    // =========================================

    @Transactional
    public Claim createClaim(ClaimRequest request) {

        validateClaimRequest(request);

        String claimNumber =
            request.getClaimNumber().trim();

        // Prevent duplicate claim numbers
        if (claimRepository
                .existsByClaimNumberIgnoreCase(claimNumber)) {

            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Claim number already exists: " + claimNumber
            );
        }

        // Find associated policy
        Policy existingPolicy =
            findPolicy(request.getPolicyId());

        // Validate policy status and coverage dates
        validatePolicyEligibility(
            existingPolicy,
            request.getClaimDate()
        );

        // New claims must start as PENDING
        if (!"PENDING".equals(request.getStatus())) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "New claims must start with PENDING status."
            );
        }

        Claim claim = new Claim();

        claim.setClaimNumber(claimNumber);
        claim.setClaimAmount(request.getClaimAmount());
        claim.setClaimDate(request.getClaimDate());
        claim.setDescription(
            request.getDescription().trim()
        );
        claim.setStatus("PENDING");
        claim.setPolicy(existingPolicy);

        return claimRepository.saveAndFlush(claim);
    }

    // =========================================
    // GET ALL CLAIMS
    // =========================================

    @Transactional(readOnly = true)
    public List<ClaimResponse> getAllClaims() {

        return claimRepository.findAll()
            .stream()
            .map(this::toResponse)
            .toList();
    }

    // =========================================
    // CONVERT ENTITY TO RESPONSE DTO
    // =========================================

    private ClaimResponse toResponse(Claim claim) {

        return new ClaimResponse(
            claim.getId(),
            claim.getClaimNumber(),
            claim.getClaimAmount(),
            claim.getClaimDate(),
            claim.getDescription(),
            claim.getStatus(),
            claim.getPolicy().getId()
        );
    }

    // =========================================
    // GET CLAIM BY ID
    // =========================================

    @Transactional(readOnly = true)
    public ClaimResponse getClaimById(Long id) {

        Claim claim = claimRepository.findById(id)
            .orElseThrow(() ->
                new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Claim not found with ID: " + id
                )
            );

        return toResponse(claim);
    }

    // =========================================
    // UPDATE CLAIM
    // =========================================

    @Transactional
    public ClaimResponse updateClaim(
            Long id,
            ClaimRequest request) {

        validateClaimRequest(request);

        Claim existingClaim = claimRepository.findById(id)
            .orElseThrow(() ->
                new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Claim not found with ID: " + id
                )
            );

        String claimNumber =
            request.getClaimNumber().trim();

        // Prevent duplicate claim numbers
        if (claimRepository
                .existsByClaimNumberIgnoreCaseAndIdNot(
                    claimNumber,
                    id
                )) {

            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Claim number already exists: " + claimNumber
            );
        }

        Policy existingPolicy =
            findPolicy(request.getPolicyId());

        // Revalidate eligibility only when the claim
        // date or associated policy changes.
        boolean policyChanged = !Objects.equals(
            existingClaim.getPolicy().getId(),
            request.getPolicyId()
        );

        boolean claimDateChanged = !Objects.equals(
            existingClaim.getClaimDate(),
            request.getClaimDate()
        );

        if (policyChanged || claimDateChanged) {
            validatePolicyEligibility(
                existingPolicy,
                request.getClaimDate()
            );
        }

        String currentStatus = existingClaim.getStatus();
        String newStatus = request.getStatus();

        // Prevent changing a finalized claim's status
        if (!"PENDING".equals(currentStatus)
                && !currentStatus.equals(newStatus)) {

            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Cannot change the status of an approved or rejected claim."
            );
        }

       

        // Determine whether history should be recorded
        boolean statusChanged =
            !Objects.equals(currentStatus, newStatus);

        // Update claim fields
        existingClaim.setClaimNumber(claimNumber);
        existingClaim.setClaimAmount(
            request.getClaimAmount()
        );
        existingClaim.setClaimDate(
            request.getClaimDate()
        );
        existingClaim.setDescription(
            request.getDescription().trim()
        );
        existingClaim.setStatus(newStatus);
        existingClaim.setPolicy(existingPolicy);

        // Save the updated claim
        Claim savedClaim =
            claimRepository.saveAndFlush(existingClaim);

        // Save history only when the status changes
        if (statusChanged) {

            ClaimStatusHistory history =
                new ClaimStatusHistory(
                    savedClaim,
                    currentStatus,
                    newStatus
                );

            historyRepository.saveAndFlush(history);
        }

        return toResponse(savedClaim);
    }
    
    // =========================================
    // GET CLAIM STATUS HISTORY
    // =========================================

    @Transactional(readOnly = true)
    public List<ClaimStatusHistoryResponse> getClaimHistory(
            Long claimId) {

        if (!claimRepository.existsById(claimId)) {
            throw new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Claim not found with ID: " + claimId
            );
        }

        return historyRepository
            .findByClaim_IdOrderByChangedAtDescIdDesc(claimId)
            .stream()
            .map(history -> new ClaimStatusHistoryResponse(
                history.getId(),
                history.getClaim().getId(),
                history.getPreviousStatus(),
                history.getNewStatus(),
                history.getChangedAt()
            ))
            .toList();
    }

    
    

    // =========================================
    // DELETE CLAIM
    // =========================================

    @Transactional
    public void deleteClaim(Long id) {

        Claim existingClaim = claimRepository.findById(id)
            .orElseThrow(() ->
                new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Claim not found with ID: " + id
                )
            );

        // Remove history before deleting the claim
        historyRepository.deleteAll(
            historyRepository
                .findByClaim_IdOrderByChangedAtDescIdDesc(id)
        );

        historyRepository.flush();

        claimRepository.delete(existingClaim);
    }
}
