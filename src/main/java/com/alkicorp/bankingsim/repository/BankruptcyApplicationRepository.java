package com.alkicorp.bankingsim.repository;

import com.alkicorp.bankingsim.model.BankruptcyApplication;
import com.alkicorp.bankingsim.model.enums.BankruptcyStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BankruptcyApplicationRepository extends JpaRepository<BankruptcyApplication, Long> {
    List<BankruptcyApplication> findBySlotId(int slotId);
    List<BankruptcyApplication> findByClientId(Long clientId);
    Optional<BankruptcyApplication> findFirstByClientIdAndStatusIn(Long clientId, List<BankruptcyStatus> statuses);
}
