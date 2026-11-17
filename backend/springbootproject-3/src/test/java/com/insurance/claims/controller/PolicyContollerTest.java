
package com.insurance.claims.controller;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.insurance.claims.entity.Policy;
import com.insurance.claims.service.PolicyService;

class PolicyContollerTest {

    private PolicyService policyService;
    private PolicyContoller policyController;

    @BeforeEach
    void setUp() {
        policyService = mock(PolicyService.class);
        policyController = new PolicyContoller(policyService);
    }

    @Test
    void shouldReturnAllPolicies() {
        Policy policy = new Policy();

        when(policyService.getAllPoicies())
                .thenReturn(List.of(policy));

        List<Policy> result =
                policyController.getAllPolicies();

        assertEquals(1, result.size());
        verify(policyService).getAllPoicies();
    }

    @Test
    void shouldReturnPolicyById() {
        Policy policy = new Policy();

        when(policyService.getPolicyById(1L))
                .thenReturn(policy);

        Policy result =
                policyController.getPolicyById(1L);

        assertSame(policy, result);
        verify(policyService).getPolicyById(1L);
    }

    @Test
    void shouldDeletePolicy() {
        var response = policyController.deletePolicy(1L);

        assertEquals(204, response.getStatusCode().value());
        verify(policyService).deletePolicy(1L);
    }
}
