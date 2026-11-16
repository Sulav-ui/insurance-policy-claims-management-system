
package com.insurance.claims.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public class PolicyRequest {

    @NotBlank(message = "Policy number is required")
    @Size(min = 3, max = 50,
          message = "Policy number must be between 3 and 50 characters")
    private String policyNumber;

    @NotBlank(message = "Policy holder name is required")
    @Size(max = 100,
          message = "Policy holder name cannot exceed 100 characters")
    private String policyHolderName;

    @NotBlank(message = "Policy type is required")
    @Size(max = 50,
          message = "Policy type cannot exceed 50 characters")
    private String policyType;

    @NotNull(message = "Premium amount is required")
    @Positive(message = "Premium amount must be greater than zero")
    @Digits(integer = 13, fraction = 2,
            message = "Premium amount can have at most 2 decimal places")
    private BigDecimal premiumAmount;

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    @NotNull(message = "End date is required")
    private LocalDate endDate;

    @NotBlank(message = "Policy status is required")
    @Pattern(
        regexp = "ACTIVE|INACTIVE|EXPIRED|CANCELLED",
        message = "Invalid policy status"
    )
    private String status;

    public PolicyRequest() {
    }

    public String getPolicyNumber() {
        return policyNumber;
    }

    public void setPolicyNumber(String policyNumber) {
        this.policyNumber = policyNumber;
    }

    public String getPolicyHolderName() {
        return policyHolderName;
    }

    public void setPolicyHolderName(String policyHolderName) {
        this.policyHolderName = policyHolderName;
    }

    public String getPolicyType() {
        return policyType;
    }

    public void setPolicyType(String policyType) {
        this.policyType = policyType;
    }

    public BigDecimal getPremiumAmount() {
        return premiumAmount;
    }

    public void setPremiumAmount(BigDecimal premiumAmount) {
        this.premiumAmount = premiumAmount;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
