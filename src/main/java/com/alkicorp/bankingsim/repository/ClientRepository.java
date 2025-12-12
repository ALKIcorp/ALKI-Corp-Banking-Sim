package com.alkicorp.bankingsim.repository;

import com.alkicorp.bankingsim.model.Client;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClientRepository extends JpaRepository<Client, Long> {
    List<Client> findBySlotId(Integer slotId);
    Optional<Client> findByIdAndSlotId(Long id, Integer slotId);
    void deleteBySlotId(Integer slotId);
}
