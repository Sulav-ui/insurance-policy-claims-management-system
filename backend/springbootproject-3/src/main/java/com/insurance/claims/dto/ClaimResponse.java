package com.insurance.claims.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ClaimResponse(
	    Long id,
	    String claimNumber,
	    BigDecimal claimAmount,
	    LocalDate claimDate,
	    String description,
	    String status,
	    Long policyId
	) {}
