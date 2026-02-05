package com.alkicorp.bankingsim.repository;

import com.alkicorp.bankingsim.model.Client;
import com.alkicorp.bankingsim.model.Transaction;
import com.alkicorp.bankingsim.model.enums.TransactionType;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    List<Transaction> findByClientOrderByCreatedAtDesc(Client client);
    List<Transaction> findByClientIn(Collection<Client> clients);
    List<Transaction> findByClientInAndTypeInOrderByCreatedAtDesc(Collection<Client> clients, Collection<TransactionType> types);
    void deleteByClientIn(Collection<Client> clients);

    boolean existsByClientIdAndTypeAndGameDay(Long clientId, com.alkicorp.bankingsim.model.enums.TransactionType type, Integer gameDay);
}
