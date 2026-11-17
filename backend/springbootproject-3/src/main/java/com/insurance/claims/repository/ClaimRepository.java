
package com.insurance.claims.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.insurance.claims.entity.Claim;

import java.math.BigDecimal;

public interface ClaimRepository extends JpaRepository<Claim, Long> {

    // Check duplicate claim number when creating a claim
    boolean existsByClaimNumberIgnoreCase(String claimNumber);

    // Check duplicate claim number when updating a claim,
    // excluding the claim currently being edited
    boolean existsByClaimNumberIgnoreCaseAndIdNot(
            String claimNumber,
            Long id
    );

    // Dashboard: Count claims by status
    long countByStatus(String status);

    // Dashboard: Calculate total claim amount
    @Query("""
        SELECT COALESCE(SUM(c.claimAmount), 0)
        FROM Claim c
    """)
    BigDecimal calculateTotalClaimAmount();
}
