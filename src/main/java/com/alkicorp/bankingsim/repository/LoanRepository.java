package com.alkicorp.bankingsim.repository;

import com.alkicorp.bankingsim.model.Loan;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LoanRepository extends JpaRepository<Loan, Long> {
    List<Loan> findBySlotIdAndUserId(int slotId, Long userId);

    Optional<Loan> findByIdAndSlotIdAndUserId(Long id, int slotId, Long userId);
}
