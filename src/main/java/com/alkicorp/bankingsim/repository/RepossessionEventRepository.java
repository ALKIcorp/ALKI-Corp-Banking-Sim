package com.alkicorp.bankingsim.repository;

import com.alkicorp.bankingsim.model.RepossessionEvent;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RepossessionEventRepository extends JpaRepository<RepossessionEvent, Long> {
    List<RepossessionEvent> findBySlotId(int slotId);
}
