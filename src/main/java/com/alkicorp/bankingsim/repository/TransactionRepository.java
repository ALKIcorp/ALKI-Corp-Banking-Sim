package com.alkicorp.bankingsim.repository;

import com.alkicorp.bankingsim.model.Client;
import com.alkicorp.bankingsim.model.Transaction;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    List<Transaction> findByClientOrderByCreatedAtDesc(Client client);
    List<Transaction> findByClientIn(Collection<Client> clients);
    void deleteByClientIn(Collection<Client> clients);
}
