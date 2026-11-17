package com.insurance.claims.dto;

import java.math.BigDecimal;

public record DashboardSummary(
        long totalPolicies,
        long activePolicies,
        long totalClaims,
        long pendingClaims,
        BigDecimal totalClaimAmount
) {}