package com.alkicorp.bankingsim.repository;

import com.alkicorp.bankingsim.model.Client;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClientRepository extends JpaRepository<Client, Long> {
    List<Client> findBySlotIdAndBankStateUserId(Integer slotId, Long userId);
    Optional<Client> findByIdAndSlotIdAndBankStateUserId(Long id, Integer slotId, Long userId);
    void deleteBySlotIdAndBankStateUserId(Integer slotId, Long userId);
}
