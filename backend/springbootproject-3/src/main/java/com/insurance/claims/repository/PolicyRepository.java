package com.insurance.claims.repository;

import com.insurance.claims.entity.Policy;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;

public interface PolicyRepository
        extends JpaRepository<Policy, Long> {

    // Check duplicate policy number when creating
    boolean existsByPolicyNumberIgnoreCase(
            String policyNumber
    );

    // Check duplicate policy number when editing
    boolean existsByPolicyNumberIgnoreCaseAndIdNot(
            String policyNumber,
            Long id
    );

    // Automatically expire ACTIVE policies
    @Modifying(clearAutomatically = true)
    @Query("""
        UPDATE Policy p
        SET p.status = 'EXPIRED'
        WHERE p.status = 'ACTIVE'
        AND p.endDate < :today
    """)
    int expireActivePolicies(
            @Param("today") LocalDate today
    );

    // Dashboard: Count active policies
    long countByStatus(String status);
}