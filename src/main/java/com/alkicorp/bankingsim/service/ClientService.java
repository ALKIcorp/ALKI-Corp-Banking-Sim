package com.alkicorp.bankingsim.service;

import com.alkicorp.bankingsim.auth.model.User;
import com.alkicorp.bankingsim.auth.service.CurrentUserService;
import com.alkicorp.bankingsim.model.BankState;
import com.alkicorp.bankingsim.model.Client;
import com.alkicorp.bankingsim.model.Transaction;
import com.alkicorp.bankingsim.model.enums.TransactionType;
import com.alkicorp.bankingsim.repository.ClientRepository;
import com.alkicorp.bankingsim.repository.TransactionRepository;
import jakarta.validation.ValidationException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class ClientService {

    private final ClientRepository clientRepository;
    private final TransactionRepository transactionRepository;
    private final SimulationService simulationService;
    private final CurrentUserService currentUserService;
    private final Clock clock = Clock.systemUTC();
    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public Client createClient(int slotId, String name) {
        if (name == null || name.isBlank()) {
            throw new ValidationException("Please enter the client's name.");
        }
        if (name.length() > 80) {
            throw new ValidationException("Client name is too long (max 80 characters).");
        }
        User user = currentUserService.getCurrentUser();
        BankState state = simulationService.getAndAdvanceState(user, slotId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, 
                "Bank state not found for slot " + slotId + ". Use POST /api/slots/" + slotId + "/start to initialize the slot."));
        Client client = new Client();
        client.setBankState(state);
        client.setSlotId(slotId);
        client.setName(name.trim());
        client.setCheckingBalance(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        client.setDailyWithdrawn(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        DebitCard card = generateDebitCard();
        client.setCardNumber(card.number());
        client.setCardExpiry(card.expiry());
        client.setCardCvv(card.cvv());
        client.setCreatedAt(Instant.now(clock));
        return clientRepository.save(client);
    }

    @Transactional(readOnly = true)
    public List<Client> getClients(int slotId) {
        User user = currentUserService.getCurrentUser();
        return clientRepository.findBySlotIdAndBankStateUserId(slotId, user.getId());
    }

    @Transactional(readOnly = true)
    public Client getClient(int slotId, Long clientId) {
        User user = currentUserService.getCurrentUser();
        return clientRepository.findByIdAndSlotIdAndBankStateUserId(clientId, slotId, user.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Client not found"));
    }

    @Transactional
    public Transaction deposit(int slotId, Long clientId, BigDecimal amount) {
        return creditAccount(slotId, clientId, amount, TransactionType.DEPOSIT, true);
    }

    @Transactional
    public Transaction withdraw(int slotId, Long clientId, BigDecimal amount) {
        validateAmount(amount, false);
        User user = currentUserService.getCurrentUser();
        BankState state = simulationService.getAndAdvanceState(user, slotId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, 
                "Bank state not found for slot " + slotId + ". Use POST /api/slots/" + slotId + "/start to initialize the slot."));
        Client client = getClient(slotId, clientId);
        if (amount.compareTo(client.getCheckingBalance()) > 0) {
            throw new ValidationException("Insufficient funds.");
        }
        BigDecimal remainingLimit = SimulationConstants.DAILY_WITHDRAWAL_LIMIT.subtract(client.getDailyWithdrawn());
        if (amount.compareTo(remainingLimit) > 0) {
            throw new ValidationException("Exceeds daily limit. You can withdraw $" + formatCurrency(remainingLimit) + " more today.");
        }
        client.setCheckingBalance(client.getCheckingBalance().subtract(amount));
        client.setDailyWithdrawn(client.getDailyWithdrawn().add(amount));
        clientRepository.save(client);
        return recordTransaction(client, state, TransactionType.WITHDRAWAL, amount);
    }

    @Transactional
    public Transaction creditAccount(int slotId, Long clientId, BigDecimal amount, TransactionType type, boolean enforceUpperLimit) {
        validateAmount(amount, enforceUpperLimit);
        User user = currentUserService.getCurrentUser();
        BankState state = simulationService.getAndAdvanceState(user, slotId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                "Bank state not found for slot " + slotId + ". Use POST /api/slots/" + slotId + "/start to initialize the slot."));
        Client client = getClient(slotId, clientId);
        client.setCheckingBalance(client.getCheckingBalance().add(amount));
        clientRepository.save(client);
        return recordTransaction(client, state, type, amount);
    }

    @Transactional
    public Transaction fundMortgageDownPayment(int slotId, Long clientId, BigDecimal amount) {
        return creditAccount(slotId, clientId, amount, TransactionType.MORTGAGE_DOWN_PAYMENT_FUNDING, false);
    }

    @Transactional(readOnly = true)
    public List<Transaction> getTransactions(Long clientId, int slotId) {
        Client client = getClient(slotId, clientId);
        return transactionRepository.findByClientOrderByCreatedAtDesc(client);
    }

    private Transaction recordTransaction(Client client, BankState state, TransactionType type, BigDecimal amount) {
        Transaction tx = new Transaction();
        tx.setClient(client);
        tx.setType(type);
        tx.setAmount(amount.setScale(2, RoundingMode.HALF_UP));
        tx.setGameDay((int) Math.floor(state.getGameDay()));
        tx.setCreatedAt(Instant.now(clock));
        return transactionRepository.save(tx);
    }

    private void validateAmount(BigDecimal amount, boolean enforceUpperLimit) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ValidationException("Invalid amount.");
        }
        if (enforceUpperLimit && amount.compareTo(BigDecimal.valueOf(1_000_000)) > 0) {
            throw new ValidationException("Invalid deposit amount (must be > 0 and <= 1,000,000).");
        }
    }

    private DebitCard generateDebitCard() {
        StringBuilder number = new StringBuilder();
        for (int i = 0; i < 16; i++) {
            number.append(secureRandom.nextInt(10));
            if ((i + 1) % 4 == 0 && i < 15) {
                number.append(' ');
            }
        }
        int expiryMonth = secureRandom.nextInt(12) + 1;
        int expiryYear = Instant.now(clock).atZone(clock.getZone()).getYear() + secureRandom.nextInt(5) + 3;
        String expiry = String.format("%02d/%02d", expiryMonth, expiryYear % 100);
        int cvv = 100 + secureRandom.nextInt(900);
        return new DebitCard(number.toString(), expiry, String.valueOf(cvv));
    }

    private String formatCurrency(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP).toPlainString();
    }

    private record DebitCard(String number, String expiry, String cvv) {
    }
}
