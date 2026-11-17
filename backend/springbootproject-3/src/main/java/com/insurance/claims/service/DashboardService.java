
package com.insurance.claims.service;

import com.insurance.claims.dto.DashboardSummary;
import com.insurance.claims.repository.PolicyRepository;
import com.insurance.claims.repository.ClaimRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
public class DashboardService {

    private final PolicyRepository policyRepository;
    private final ClaimRepository claimRepository;

    public DashboardService(
            PolicyRepository policyRepository,
            ClaimRepository claimRepository) {

        this.policyRepository = policyRepository;
        this.claimRepository = claimRepository;
    }

    @Transactional(readOnly = true)
    public DashboardSummary getDashboardSummary() {

        long totalPolicies = policyRepository.count();

        long activePolicies =
                policyRepository.countByStatus("ACTIVE");

        long totalClaims = claimRepository.count();

        long pendingClaims =
                claimRepository.countByStatus("PENDING");

        BigDecimal totalClaimAmount =
                claimRepository.calculateTotalClaimAmount();

        return new DashboardSummary(
                totalPolicies,
                activePolicies,
                totalClaims,
                pendingClaims,
                totalClaimAmount
        );
    }
}
