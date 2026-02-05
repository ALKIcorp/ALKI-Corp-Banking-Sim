package com.alkicorp.bankingsim.service;

import com.alkicorp.bankingsim.model.Client;
import com.alkicorp.bankingsim.model.ClientLiving;
import com.alkicorp.bankingsim.model.Transaction;
import com.alkicorp.bankingsim.model.enums.TransactionType;
import com.alkicorp.bankingsim.repository.ClientLivingRepository;
import com.alkicorp.bankingsim.repository.TransactionRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RentService {

    private final ClientLivingRepository clientLivingRepository;
    private final TransactionRepository transactionRepository;
    private final Clock clock = Clock.systemUTC();

    @Transactional
    public void chargeRent(int slotId, Long userId, double gameDay) {
        List<ClientLiving> livings = clientLivingRepository.findBySlotIdAndClientBankStateUserId(slotId, userId);
        int day = (int) Math.floor(gameDay);
        for (ClientLiving living : livings) {
            if (living.getMonthlyRentCache() == null || living.getMonthlyRentCache().compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            Integer nextRentDay = living.getNextRentDay();
            if (nextRentDay == null) {
                living.setNextRentDay(day + SimulationConstants.REPAYMENT_PERIOD_DAYS);
                clientLivingRepository.save(living);
                continue;
            }
            if (day < nextRentDay) {
                continue;
            }
            debitRent(living.getClient(), living.getMonthlyRentCache(), gameDay);
            living.setNextRentDay(day + SimulationConstants.REPAYMENT_PERIOD_DAYS);
            clientLivingRepository.save(living);
        }
    }

    private void debitRent(Client client, BigDecimal amount, double gameDay) {
        BigDecimal payAmount = client.getCheckingBalance().min(amount);
        client.setCheckingBalance(client.getCheckingBalance().subtract(payAmount));
        Transaction tx = new Transaction();
        tx.setClient(client);
        tx.setType(payAmount.compareTo(amount) >= 0 ? TransactionType.RENT_PAYMENT : TransactionType.PAYMENT_FAILED);
        tx.setAmount(payAmount);
        tx.setGameDay((int) Math.floor(gameDay));
        tx.setCreatedAt(Instant.now(clock));
        transactionRepository.save(tx);
    }
}
