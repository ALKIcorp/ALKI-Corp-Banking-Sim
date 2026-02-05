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
    public void chargeRent(int slotId, double gameDay) {
        int dayOfMonth = ((int) Math.floor(gameDay) % 30) + 1;
        if (dayOfMonth != 1) {
            return;
        }
        List<ClientLiving> livings = clientLivingRepository.findBySlotId(slotId);
        for (ClientLiving living : livings) {
            if (living.getMonthlyRentCache() != null && living.getMonthlyRentCache().compareTo(BigDecimal.ZERO) > 0) {
                debitRent(living.getClient(), living.getMonthlyRentCache(), gameDay);
            }
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
