
package com.insurance.claims.dto;

import java.time.LocalDateTime;

public record ClaimStatusHistoryResponse(
    Long id,
    Long claimId,
    String previousStatus,
    String newStatus,
    LocalDateTime changedAt
) {
}