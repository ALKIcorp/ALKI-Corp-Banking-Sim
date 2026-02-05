package com.alkicorp.bankingsim.service;

import com.alkicorp.bankingsim.model.Client;
import com.alkicorp.bankingsim.model.SpendingCategory;
import com.alkicorp.bankingsim.model.Transaction;
import com.alkicorp.bankingsim.model.enums.TransactionType;
import com.alkicorp.bankingsim.repository.ClientRepository;
import com.alkicorp.bankingsim.repository.SpendingCategoryRepository;
import com.alkicorp.bankingsim.repository.TransactionRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Random;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class SpendingService {

    private final SpendingCategoryRepository spendingCategoryRepository;
    private final ClientRepository clientRepository;
    private final TransactionRepository transactionRepository;
    private final Clock clock = Clock.systemUTC();
    private final Random random = new Random();

    @Transactional
    public List<Transaction> generateSpending(int slotId, Long clientId) {
        // Fallback entry point (e.g. legacy button). Derive the current game day from the client’s bank state.
        Client client = clientRepository.findById(clientId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Client not found"));
        double bankGameDay = client.getBankState() != null && client.getBankState().getGameDay() != null
            ? client.getBankState().getGameDay()
            : 0d;
        return generateSpending(slotId, clientId, (int) Math.floor(bankGameDay));
    }

    public List<Transaction> generateSpending(int slotId, Long clientId, int gameDay) {
        Client client = clientRepository.findById(clientId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Client not found"));

        // Avoid double-charging the same simulated day
        if (transactionRepository.existsByClientIdAndTypeAndGameDay(clientId, TransactionType.SPENDING, gameDay)) {
            return List.of();
        }

        BigDecimal disposableCalc = client.getMonthlyIncomeCache() != null
            ? client.getMonthlyIncomeCache().subtract(
                client.getMonthlyMandatoryCache() == null ? BigDecimal.ZERO : client.getMonthlyMandatoryCache())
            : BigDecimal.ZERO;
        if (disposableCalc.compareTo(BigDecimal.ZERO) < 0) {
            disposableCalc = BigDecimal.ZERO;
        }

        List<SpendingCategory> categories = spendingCategoryRepository.findAllByOrderByIdAsc();
        BigDecimal disposable = disposableCalc;
        return categories.stream()
            .filter(cat -> Boolean.TRUE.equals(cat.getDefaultActive()))
            .map(cat -> spendInCategory(client, gameDay, disposable, cat))
            .filter(t -> t != null)
            .toList();
    }

    private Transaction spendInCategory(Client client, double gameDay, BigDecimal disposable, SpendingCategory cat) {
        if (disposable.compareTo(BigDecimal.ZERO) <= 0) {
            return null;
        }
        double basePct = cat.getMinPctIncome().doubleValue() +
            random.nextDouble() * (cat.getMaxPctIncome().doubleValue() - cat.getMinPctIncome().doubleValue());
        double variability = cat.getVariability() != null ? cat.getVariability().doubleValue() : 0d;
        double swing = variability > 0 ? (random.nextDouble() * 2 * variability - variability) : 0d; // range [-var, +var]
        double pct = Math.max(0d, basePct * (1 + swing));
        BigDecimal target = client.getMonthlyIncomeCache() != null
            ? client.getMonthlyIncomeCache().multiply(BigDecimal.valueOf(pct))
            : BigDecimal.ZERO;
        BigDecimal daily = target.divide(BigDecimal.valueOf(30), 2, RoundingMode.HALF_UP);
        BigDecimal amount = daily.min(client.getCheckingBalance());
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            return null;
        }
        client.setCheckingBalance(client.getCheckingBalance().subtract(amount));
        clientRepository.save(client);
        Transaction tx = new Transaction();
        tx.setClient(client);
        tx.setType(TransactionType.SPENDING);
        tx.setAmount(amount.setScale(2, RoundingMode.HALF_UP));
        tx.setGameDay((int) Math.floor(gameDay));
        tx.setCreatedAt(Instant.now(clock));
        return transactionRepository.save(tx);
    }
}
