package com.alkicorp.bankingsim.repository;

import com.alkicorp.bankingsim.model.ClientJob;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClientJobRepository extends JpaRepository<ClientJob, Long> {
    List<ClientJob> findBySlotId(int slotId);
    List<ClientJob> findByClientId(Long clientId);
    Optional<ClientJob> findFirstByClientIdAndPrimaryTrueOrderByStartDateDesc(Long clientId);
}
