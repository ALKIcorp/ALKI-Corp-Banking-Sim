package com.alkicorp.bankingsim.repository;

import com.alkicorp.bankingsim.model.Client;
import com.alkicorp.bankingsim.model.Transaction;
import com.alkicorp.bankingsim.model.enums.TransactionType;
import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    List<Transaction> findByClientOrderByCreatedAtDesc(Client client);
    List<Transaction> findByClientIn(Collection<Client> clients);
    List<Transaction> findByClientInAndTypeInOrderByCreatedAtDesc(Collection<Client> clients, Collection<TransactionType> types);
    void deleteByClientIn(Collection<Client> clients);

    boolean existsByClientIdAndTypeAndGameDay(Long clientId, com.alkicorp.bankingsim.model.enums.TransactionType type, Integer gameDay);

    @Query("""
            select
              coalesce(sum(case when t.type in :depositTypes then t.amount else 0 end), 0) as income,
              coalesce(sum(case when t.type in :depositTypes then 0 else t.amount end), 0) as spending
            from Transaction t
            where t.client.id = :clientId
              and t.client.slotId = :slotId
              and t.gameDay = :gameMonth
            """)
    MonthlyCashflowProjection findMonthlyCashflow(@Param("clientId") Long clientId,
            @Param("slotId") Integer slotId,
            @Param("gameMonth") Integer gameMonth,
            @Param("depositTypes") Collection<TransactionType> depositTypes);

    @Query("""
            select coalesce(sum(t.amount), 0)
            from Transaction t
            where t.client.id = :clientId
              and t.type in :types
              and t.gameDay >= :startDay
              and (:endDay is null or t.gameDay < :endDay)
            """)
    BigDecimal sumByClientAndTypesAndDayRange(@Param("clientId") Long clientId,
            @Param("types") Collection<TransactionType> types,
            @Param("startDay") Integer startDay,
            @Param("endDay") Integer endDay);

    interface MonthlyCashflowProjection {
        BigDecimal getIncome();
        BigDecimal getSpending();
    }
}
