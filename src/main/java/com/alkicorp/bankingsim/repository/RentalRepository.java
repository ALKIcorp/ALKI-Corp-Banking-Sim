package com.alkicorp.bankingsim.repository;

import com.alkicorp.bankingsim.model.Rental;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RentalRepository extends JpaRepository<Rental, Long> {
    List<Rental> findByStatus(String status);
}
