
package com.insurance.claims.scheduler;

import com.insurance.claims.repository.PolicyRepository;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;

@Component
public class PolicyExpirationScheduler {

    private final PolicyRepository policyRepository;

    public PolicyExpirationScheduler(
            PolicyRepository policyRepository
    ) {
        this.policyRepository = policyRepository;
    }

//    @Scheduled(
//        cron = "0 0 * * * *",
//        zone = "America/Chicago"
//    )
    @Scheduled(fixedRate = 30000)
    @Transactional
    public void expirePolicies() {

        LocalDate today = LocalDate.now(
            ZoneId.of("America/Chicago")
        );

        int updatedCount =
                policyRepository.expireActivePolicies(today);

        System.out.println(
            "Policy expiration check completed. "
            + "Expired policies updated: "
            + updatedCount
        );
    }
}
