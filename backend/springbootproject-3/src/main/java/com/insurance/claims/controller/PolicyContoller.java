
package com.insurance.claims.controller;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.insurance.claims.dto.PolicyRequest;
import com.insurance.claims.entity.Policy;
import com.insurance.claims.service.PolicyService;

@RestController
@RequestMapping("/api/policies")
public class PolicyContoller {

    private final PolicyService policyService;

    public PolicyContoller(PolicyService policyService) {
        this.policyService = policyService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Policy createPolicy(
            @Valid @RequestBody PolicyRequest request) {

        return policyService.createPolicy(request);
    }

    @GetMapping
    public List<Policy> getAllPolicies() {
        return policyService.getAllPoicies();
    }

    @GetMapping("/{id}")
    public Policy getPolicyById(@PathVariable Long id) {
        return policyService.getPolicyById(id);
    }

    @PutMapping("/{id}")
    public Policy updatePolicy(
            @PathVariable Long id,
            @Valid @RequestBody PolicyRequest request) {

        return policyService.updatePolicy(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePolicy(
            @PathVariable Long id) {

        policyService.deletePolicy(id);

        return ResponseEntity.noContent().build();
    }
}
