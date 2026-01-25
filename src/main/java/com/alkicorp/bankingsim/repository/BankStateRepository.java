package com.alkicorp.bankingsim.repository;

import com.alkicorp.bankingsim.model.BankState;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BankStateRepository extends JpaRepository<BankState, Long> {
    Optional<BankState> findBySlotIdAndUserId(Integer slotId, Long userId);
}
