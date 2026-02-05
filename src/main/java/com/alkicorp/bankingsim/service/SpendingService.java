package com.alkicorp.bankingsim.service;

import com.alkicorp.bankingsim.model.Client;
import com.alkicorp.bankingsim.model.SpendingCategory;
import com.alkicorp.bankingsim.model.Transaction;
import com.alkicorp.bankingsim.model.enums.TransactionType;
import com.alkicorp.bankingsim.repository.ClientJobRepository;
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
    private final ClientJobRepository clientJobRepository;
    private final TransactionRepository transactionRepository;
    private final MandatorySpendService mandatorySpendService;
    private final Clock clock = Clock.systemUTC();
    private final Random random = new Random();

    @Transactional
    public List<Transaction> generateSpending(int slotId, Long clientId) {
        // Fallback entry point (e.g. legacy button). Derive the current game day from
        // the client’s bank state.
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

        BigDecimal monthlyIncome = resolveMonthlyIncome(client);
        // Use central service for mandatory spend (loans, mortgages, rent)
        BigDecimal mandatory = mandatorySpendService.recalcAndPersist(client);

        BigDecimal disposableCalc = monthlyIncome.subtract(mandatory);
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

        // Random day distribution: each category has a ~1/30 chance per day to trigger
        // This spreads expenses throughout the month instead of all on the same day
        double triggerChance = 1.0 / 30.0;
        if (random.nextDouble() > triggerChance) {
            return null; // Skip this category today
        }

        double basePct = cat.getMinPctIncome().doubleValue() +
                random.nextDouble() * (cat.getMaxPctIncome().doubleValue() - cat.getMinPctIncome().doubleValue());
        double variability = cat.getVariability() != null ? cat.getVariability().doubleValue() : 0d;
        double swing = variability > 0 ? (random.nextDouble() * 2 * variability - variability) : 0d; // range [-var,
                                                                                                     // +var]
        double pct = Math.max(0d, basePct * (1 + swing));

        // Calculate spending based on DISPOSABLE income (remainder after mandatory
        // payments)
        // not total monthly income
        BigDecimal target = disposable.multiply(BigDecimal.valueOf(pct));

        // In this simulation, 1 game day = 1 month (12 days per year).
        // Therefore, the "monthly" target is the daily spend.
        BigDecimal amount = target.min(client.getCheckingBalance());
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

    /**
     * Populate monthlyIncomeCache if missing by summing active jobs' annual
     * salaries / DAYS_PER_YEAR.
     * This keeps spending working even when the cache was never prefilled
     * elsewhere.
     */
    private BigDecimal resolveMonthlyIncome(Client client) {
        if (client.getMonthlyIncomeCache() != null) {
            return client.getMonthlyIncomeCache();
        }
        BigDecimal monthlyIncome = clientJobRepository.findByClientId(client.getId()).stream()
                .filter(cj -> Boolean.TRUE.equals(cj.getPrimary()))
                .map(cj -> cj.getJob().getAnnualSalary().divide(BigDecimal.valueOf(SimulationConstants.DAYS_PER_YEAR),
                        2,
                        RoundingMode.HALF_UP))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        client.setMonthlyIncomeCache(monthlyIncome);
        clientRepository.save(client);
        return monthlyIncome;
    }
}
