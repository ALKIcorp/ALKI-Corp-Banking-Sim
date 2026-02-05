package com.alkicorp.bankingsim.repository;

import com.alkicorp.bankingsim.model.SpendingCategory;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SpendingCategoryRepository extends JpaRepository<SpendingCategory, Long> {
    List<SpendingCategory> findAllByOrderByIdAsc();
}
