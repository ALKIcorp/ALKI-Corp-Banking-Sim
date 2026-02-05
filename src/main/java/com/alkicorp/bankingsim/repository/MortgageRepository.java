package com.alkicorp.bankingsim.repository;

import com.alkicorp.bankingsim.model.Mortgage;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MortgageRepository extends JpaRepository<Mortgage, Long> {
    List<Mortgage> findBySlotId(int slotId);

    List<Mortgage> findBySlotIdAndUserId(int slotId, Long userId);

    List<Mortgage> findByClientId(Long clientId);

    Optional<Mortgage> findByIdAndSlotId(Long id, int slotId);

    Optional<Mortgage> findByIdAndSlotIdAndUserId(Long id, int slotId, Long userId);
}
