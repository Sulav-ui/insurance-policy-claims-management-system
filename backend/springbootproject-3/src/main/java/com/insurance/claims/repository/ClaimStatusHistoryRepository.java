
package com.insurance.claims.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.insurance.claims.entity.ClaimStatusHistory;

public interface ClaimStatusHistoryRepository
        extends JpaRepository<ClaimStatusHistory, Long> {

    List<ClaimStatusHistory>
        findByClaim_IdOrderByChangedAtDescIdDesc(Long claimId);
}