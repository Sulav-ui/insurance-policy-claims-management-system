
package com.insurance.claims.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.insurance.claims.entity.Claim;

public interface ClaimRepository extends JpaRepository<Claim, Long> {

    // Check duplicate claim number when creating a claim
    boolean existsByClaimNumberIgnoreCase(String claimNumber);

    // Check duplicate claim number when updating a claim,
    // excluding the claim currently being edited
    boolean existsByClaimNumberIgnoreCaseAndIdNot(
            String claimNumber,
            Long id
    );
}
