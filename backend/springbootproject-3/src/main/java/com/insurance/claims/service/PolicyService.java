
package com.insurance.claims.service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.insurance.claims.dto.PolicyRequest;
import com.insurance.claims.entity.Policy;
import com.insurance.claims.repository.PolicyRepository;

@Service
public class PolicyService {

    private final PolicyRepository policyRepository;

    public PolicyService(PolicyRepository policyRepository) {
        this.policyRepository = policyRepository;
    }

    // CREATE POLICY
    @Transactional
    public Policy createPolicy(PolicyRequest request) {

        validatePolicyRequest(request);

        // New policies can only be ACTIVE or INACTIVE.
        if (!request.getStatus().equals("ACTIVE")
                && !request.getStatus().equals("INACTIVE")) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "New policies must have ACTIVE or INACTIVE status"
            );
        }

        // Prevent duplicate policy numbers.
        if (policyRepository.existsByPolicyNumberIgnoreCase(
                request.getPolicyNumber().trim())) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Policy number already exists"
            );
        }

        Policy policy = new Policy();
        applyRequest(policy, request);

        return policyRepository.saveAndFlush(policy);
    }

    // GET ALL POLICIES
    @Transactional(readOnly = true)
    public List<Policy> getAllPoicies() {
        return policyRepository.findAll();
    }

    // GET POLICY BY ID
    @Transactional(readOnly = true)
    public Policy getPolicyById(Long id) {
        return policyRepository.findById(id)
            .orElseThrow(() ->
                new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Policy not found with ID: " + id
                )
            );
    }

    // UPDATE POLICY
    @Transactional
    public Policy updatePolicy(
            Long id,
            PolicyRequest request) {

        Policy existingPolicy = getPolicyById(id);

        validatePolicyRequest(request);

        // Exclude the current policy when checking duplicates.
        if (policyRepository
                .existsByPolicyNumberIgnoreCaseAndIdNot(
                    request.getPolicyNumber().trim(),
                    id
                )) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Policy number already exists"
            );
        }

        applyRequest(existingPolicy, request);

        return policyRepository.saveAndFlush(existingPolicy);
    }

    // DELETE POLICY
    @Transactional
    public void deletePolicy(Long id) {

        Policy existingPolicy = getPolicyById(id);

        policyRepository.delete(existingPolicy);
    }

    // VALIDATE POLICY BUSINESS RULES
    private void validatePolicyRequest(PolicyRequest request) {

        // Validate policy number
        if (request.getPolicyNumber() == null
                || request.getPolicyNumber().isBlank()) {

            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Policy number is required"
            );
        }

        // Validate required dates
        if (request.getStartDate() == null
                || request.getEndDate() == null) {

            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Start date and end date are required"
            );
        }

        // End date must be after start date
        if (!request.getEndDate().isAfter(
                request.getStartDate())) {

            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "End date must be after start date"
            );
        }

        // Validate policy status
        if (request.getStatus() == null
                || !List.of(
                    "ACTIVE",
                    "INACTIVE",
                    "EXPIRED",
                    "CANCELLED"
                ).contains(request.getStatus())) {

            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Invalid policy status"
            );
        }

        // Get today's date using Central Time
        LocalDate today = LocalDate.now(
            ZoneId.of("America/Chicago")
        );

        // Prevent expired policies from being ACTIVE
        if ("ACTIVE".equals(request.getStatus())
                && request.getEndDate().isBefore(today)) {

            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "An expired policy cannot have ACTIVE status."
            );
        }
    }

    // COPY DTO FIELDS INTO ENTITY
    private void applyRequest(
            Policy policy,
            PolicyRequest request) {

        policy.setPolicyNumber(
            request.getPolicyNumber().trim()
        );

        policy.setPolicyHolderName(
            request.getPolicyHolderName().trim()
        );

        policy.setPolicyType(
            request.getPolicyType().trim()
        );

        policy.setPremiumAmount(
            request.getPremiumAmount()
        );

        policy.setStartDate(
            request.getStartDate()
        );

        policy.setEndDate(
            request.getEndDate()
        );

        policy.setStatus(
            request.getStatus()
        );
    }
}
