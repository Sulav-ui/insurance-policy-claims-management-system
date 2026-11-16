
package com.insurance.claims.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.*;

public class ClaimRequest {

    // Policy ID must be provided and positive
    @NotNull(message = "Policy ID is required")
    @Positive(message = "Policy ID must be greater than zero")
    private Long policyId;

    // Claim number must contain 3 to 50 characters
    @NotBlank(message = "Claim number is required")
    @Size(
        min = 3,
        max = 50,
        message = "Claim number must contain between 3 and 50 characters"
    )
    private String claimNumber;

    // Claim amount must be positive
    @NotNull(message = "Claim amount is required")
    @Positive(message = "Claim amount must be greater than zero")
    @Digits(
        integer = 13,
        fraction = 2,
        message = "Claim amount must have at most 13 integer digits and 2 decimal places"
    )
    private BigDecimal claimAmount;

    // Claim date cannot be in the future
    @NotNull(message = "Claim date is required")
    @PastOrPresent(message = "Claim date cannot be in the future")
    private LocalDate claimDate;

    // Description is required
    @NotBlank(message = "Description is required")
    @Size(
        max = 1000,
        message = "Description cannot exceed 1000 characters"
    )
    private String description;

    // Only allowed statuses
    @NotBlank(message = "Claim status is required")
    @Pattern(
        regexp = "PENDING|APPROVED|REJECTED",
        message = "Status must be PENDING, APPROVED, or REJECTED"
    )
    private String status;

    public ClaimRequest() {
    }

    public Long getPolicyId() {
        return policyId;
    }

    public void setPolicyId(Long policyId) {
        this.policyId = policyId;
    }

    public String getClaimNumber() {
        return claimNumber;
    }

    public void setClaimNumber(String claimNumber) {
        this.claimNumber = claimNumber;
    }

    public BigDecimal getClaimAmount() {
        return claimAmount;
    }

    public void setClaimAmount(BigDecimal claimAmount) {
        this.claimAmount = claimAmount;
    }

    public LocalDate getClaimDate() {
        return claimDate;
    }

    public void setClaimDate(LocalDate claimDate) {
        this.claimDate = claimDate;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
