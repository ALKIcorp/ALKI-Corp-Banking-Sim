package com.alkicorp.bankingsim.repository;

import com.alkicorp.bankingsim.model.ClientLiving;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClientLivingRepository extends JpaRepository<ClientLiving, Long> {
    Optional<ClientLiving> findByClientIdAndSlotId(Long clientId, int slotId);
    List<ClientLiving> findBySlotId(int slotId);
    List<ClientLiving> findBySlotIdAndClientBankStateUserId(int slotId, Long userId);
}
