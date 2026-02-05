package com.alkicorp.bankingsim.service;

import com.alkicorp.bankingsim.auth.service.CurrentUserService;
import com.alkicorp.bankingsim.model.Client;
import com.alkicorp.bankingsim.model.Transaction;
import com.alkicorp.bankingsim.model.enums.TransactionType;
import com.alkicorp.bankingsim.repository.ClientRepository;
import com.alkicorp.bankingsim.repository.TransactionRepository;
import jakarta.validation.ValidationException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SavingsService {

    private final ClientService clientService;
    private final ClientRepository clientRepository;
    private final TransactionRepository transactionRepository;
    private final SimulationService simulationService;
    private final CurrentUserService currentUserService;
    private final Clock clock = Clock.systemUTC();

    @Transactional
    public Transaction depositToSavings(int slotId, Long clientId, BigDecimal amount) {
        validateAmount(amount);
        Client client = clientService.getClient(slotId, clientId);
        if (amount.compareTo(client.getCheckingBalance()) > 0) {
            throw new ValidationException("Insufficient checking balance.");
        }
        client.setCheckingBalance(client.getCheckingBalance().subtract(amount));
        client.setSavingsBalance(client.getSavingsBalance().add(amount));
        clientRepository.save(client);
        return record(client, slotId, amount, TransactionType.SAVINGS_DEPOSIT);
    }

    @Transactional
    public Transaction withdrawFromSavings(int slotId, Long clientId, BigDecimal amount) {
        validateAmount(amount);
        Client client = clientService.getClient(slotId, clientId);
        if (amount.compareTo(client.getSavingsBalance()) > 0) {
            throw new ValidationException("Insufficient savings balance.");
        }
        client.setSavingsBalance(client.getSavingsBalance().subtract(amount));
        client.setCheckingBalance(client.getCheckingBalance().add(amount));
        clientRepository.save(client);
        return record(client, slotId, amount, TransactionType.SAVINGS_WITHDRAWAL);
    }

    private Transaction record(Client client, int slotId, BigDecimal amount, TransactionType type) {
        int gameDay = simulationService.getAndAdvanceState(currentUserService.getCurrentUser(), slotId)
                .map(state -> (int) Math.floor(state.getGameDay())).orElse(0);
        Transaction tx = new Transaction();
        tx.setClient(client);
        tx.setType(type);
        tx.setAmount(amount.setScale(2, RoundingMode.HALF_UP));
        tx.setGameDay(gameDay);
        tx.setCreatedAt(Instant.now(clock));
        return transactionRepository.save(tx);
    }

    private void validateAmount(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ValidationException("Amount must be positive.");
        }
    }
}
