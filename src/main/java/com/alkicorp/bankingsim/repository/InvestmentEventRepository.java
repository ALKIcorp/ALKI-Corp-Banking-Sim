package com.alkicorp.bankingsim.repository;

import com.alkicorp.bankingsim.model.InvestmentEvent;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InvestmentEventRepository extends JpaRepository<InvestmentEvent, Long> {
    List<InvestmentEvent> findBySlotId(Integer slotId);
    void deleteBySlotId(Integer slotId);
}
