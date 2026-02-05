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
import java.util.ArrayList;
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
                .flatMap(cat -> spendInCategory(client, gameDay, disposable, cat).stream())
                .toList();
    }

    private List<Transaction> spendInCategory(Client client, double gameDay, BigDecimal disposable,
            SpendingCategory cat) {
        if (disposable.compareTo(BigDecimal.ZERO) <= 0) {
            return List.of();
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
        // Split the monthly target into multiple events to spread spending across the month.
        BigDecimal available = target.min(client.getCheckingBalance());
        if (available.compareTo(BigDecimal.ZERO) <= 0) {
            return List.of();
        }

        int events = Math.max(1, SimulationConstants.SPENDING_EVENTS_PER_MONTH);
        List<BigDecimal> splits = splitAmount(available, events);

        List<Transaction> transactions = new ArrayList<>();
        BigDecimal remainingBalance = client.getCheckingBalance();
        Instant now = Instant.now(clock);
        for (BigDecimal split : splits) {
            if (remainingBalance.compareTo(BigDecimal.ZERO) <= 0) {
                break;
            }
            BigDecimal amount = split.min(remainingBalance).setScale(2, RoundingMode.HALF_UP);
            if (amount.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            remainingBalance = remainingBalance.subtract(amount);
            Transaction tx = new Transaction();
            tx.setClient(client);
            tx.setType(TransactionType.SPENDING);
            tx.setAmount(amount);
            tx.setGameDay((int) Math.floor(gameDay));
            tx.setCreatedAt(now);
            transactions.add(transactionRepository.save(tx));
        }

        if (!transactions.isEmpty()) {
            client.setCheckingBalance(remainingBalance);
            clientRepository.save(client);
        }

        return transactions;
    }

    private List<BigDecimal> splitAmount(BigDecimal total, int events) {
        if (events <= 1) {
            return List.of(total);
        }
        double[] weights = new double[events];
        double weightSum = 0d;
        for (int i = 0; i < events; i++) {
            double weight = 0.5 + random.nextDouble(); // 0.5 - 1.5
            weights[i] = weight;
            weightSum += weight;
        }
        List<BigDecimal> splits = new ArrayList<>(events);
        BigDecimal remaining = total;
        for (int i = 0; i < events; i++) {
            BigDecimal portion;
            if (i == events - 1) {
                portion = remaining;
            } else {
                double ratio = weights[i] / weightSum;
                portion = total.multiply(BigDecimal.valueOf(ratio)).setScale(2, RoundingMode.HALF_UP);
                if (portion.compareTo(remaining) > 0) {
                    portion = remaining;
                }
                remaining = remaining.subtract(portion);
            }
            if (portion.compareTo(BigDecimal.ZERO) > 0) {
                splits.add(portion);
            }
        }
        return splits;
    }

    /**
     * Populate monthlyIncomeCache if missing by summing active jobs' annual
     * salaries / DAYS_PER_YEAR.
     * This keeps spending working even when the cache was never prefilled
     * elsewhere.
     */
    private BigDecimal resolveMonthlyIncome(Client client) {
        if (client.getMonthlyIncomeCache() != null
                && client.getMonthlyIncomeCache().compareTo(BigDecimal.ZERO) > 0) {
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
