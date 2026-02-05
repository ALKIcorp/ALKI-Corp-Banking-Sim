package com.alkicorp.bankingsim.repository;

import com.alkicorp.bankingsim.model.Job;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JobRepository extends JpaRepository<Job, Long> {
    List<Job> findAllByOrderByTitleAsc();
}
