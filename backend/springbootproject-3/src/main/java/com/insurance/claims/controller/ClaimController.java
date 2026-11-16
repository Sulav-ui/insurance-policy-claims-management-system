
package com.insurance.claims.controller;

import java.util.List;


import com.insurance.claims.dto.ClaimRequest;
import com.insurance.claims.dto.ClaimResponse;
import com.insurance.claims.service.ClaimService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.insurance.claims.dto.ClaimStatusHistoryResponse;

@RestController
@RequestMapping("/api/claims")
public class ClaimController {

    private final ClaimService claimService;

    public ClaimController(ClaimService claimService) {
        this.claimService = claimService;
    }

    // Create Claim
    @PostMapping
    public ResponseEntity<Void> createClaim(
            @Valid @RequestBody ClaimRequest request) {

        claimService.createClaim(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .build();
    }

    // Get All Claims
    @GetMapping
    public List<ClaimResponse> getAllClaims() {
        return claimService.getAllClaims();
    }

    // Get Claim By ID
    @GetMapping("/{id}")
    public ClaimResponse getClaimById(
            @PathVariable Long id) {

        return claimService.getClaimById(id);
    }

    // Update Claim
    @PutMapping("/{id}")
    public ClaimResponse updateClaim(
            @PathVariable Long id,
            @Valid @RequestBody ClaimRequest request) {

        return claimService.updateClaim(id, request);
    }

    // Delete Claim
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteClaim(
            @PathVariable Long id) {

        claimService.deleteClaim(id);

        return ResponseEntity.noContent().build();
    }
    

    // =========================================
    // GET CLAIM HISTORY
    // =========================================

    @GetMapping("/{id}/history")
    public List<ClaimStatusHistoryResponse> getClaimHistory(
            @PathVariable Long id) {

        return claimService.getClaimHistory(id);
    }
}
