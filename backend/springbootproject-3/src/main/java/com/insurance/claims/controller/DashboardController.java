
package com.insurance.claims.controller;

import com.insurance.claims.dto.DashboardSummary;
import com.insurance.claims.service.DashboardService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(
            DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/summary")
    public ResponseEntity<DashboardSummary> getSummary() {

        DashboardSummary summary =
                dashboardService.getDashboardSummary();

        return ResponseEntity.ok(summary);
    }
}
