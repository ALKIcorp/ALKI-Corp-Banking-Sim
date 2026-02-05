package com.alkicorp.bankingsim.service;

import com.alkicorp.bankingsim.auth.model.User;
import com.alkicorp.bankingsim.model.BankState;
import com.alkicorp.bankingsim.model.Client;
import com.alkicorp.bankingsim.model.InvestmentEvent;
import com.alkicorp.bankingsim.model.Loan;
import com.alkicorp.bankingsim.model.Mortgage;
import com.alkicorp.bankingsim.model.Transaction;
import com.alkicorp.bankingsim.model.enums.InvestmentEventType;
import com.alkicorp.bankingsim.model.enums.TransactionType;
import com.alkicorp.bankingsim.repository.BankStateRepository;
import com.alkicorp.bankingsim.repository.ClientRepository;
import com.alkicorp.bankingsim.repository.InvestmentEventRepository;
import com.alkicorp.bankingsim.repository.LoanRepository;
import com.alkicorp.bankingsim.repository.MortgageRepository;
import com.alkicorp.bankingsim.repository.TransactionRepository;
import java.io.FileWriter;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SimulationService {

    private static final BigDecimal STARTING_CASH = BigDecimal.valueOf(100_000).setScale(2, RoundingMode.HALF_UP);

    private final BankStateRepository bankStateRepository;
    private final ClientRepository clientRepository;
    private final TransactionRepository transactionRepository;
    private final InvestmentEventRepository investmentEventRepository;
    private final LoanRepository loanRepository;
    private final MortgageRepository mortgageRepository;
    private final PayrollService payrollService;
    private final RentService rentService;
    private final SpendingService spendingService;
    private final BankruptcyService bankruptcyService;
    private final Clock clock = Clock.systemUTC();

    @Transactional
    public BankState resetSlot(User user, int slotId) {
        // #region agent log
        System.out.println("  → Resetting slot " + slotId + " (clearing existing data and preparing fresh state)");
        try (FileWriter fw = new FileWriter(
                "/Users/alkicorp/Documents/ALKIcorp/B5_CLASSES/TRANSWEB_420-951/project transweb/alkicorp_banking_sim/banking-sim-api/.cursor/debug.log",
                true)) {
            fw.write(
                    "{\"sessionId\":\"debug-session\",\"runId\":\"run1\",\"hypothesisId\":\"H4\",\"location\":\"SimulationService.resetSlot:40\",\"message\":\"resetSlot called - WILL DELETE SEED DATA\",\"data\":{\"slotId\":"
                            + slotId + "},\"timestamp\":" + System.currentTimeMillis() + "}\n");
        } catch (IOException e) {
        }
        // #endregion
        List<Client> clients = clientRepository.findBySlotIdAndBankStateUserId(slotId, user.getId());
        // #region agent log
        try (FileWriter fw = new FileWriter(
                "/Users/alkicorp/Documents/ALKIcorp/B5_CLASSES/TRANSWEB_420-951/project transweb/alkicorp_banking_sim/banking-sim-api/.cursor/debug.log",
                true)) {
            fw.write(
                    "{\"sessionId\":\"debug-session\",\"runId\":\"run1\",\"hypothesisId\":\"H4\",\"location\":\"SimulationService.resetSlot:47\",\"message\":\"Clients found before deletion\",\"data\":{\"slotId\":"
                            + slotId + ",\"clientCount\":" + clients.size() + "},\"timestamp\":"
                            + System.currentTimeMillis() + "}\n");
        } catch (IOException e) {
        }
        // #endregion
        if (!clients.isEmpty()) {
            transactionRepository.deleteByClientIn(clients);
        }
        clientRepository.deleteBySlotIdAndBankStateUserId(slotId, user.getId());
        investmentEventRepository.deleteBySlotIdAndUserId(slotId, user.getId());
        // #region agent log
        try (FileWriter fw = new FileWriter(
                "/Users/alkicorp/Documents/ALKIcorp/B5_CLASSES/TRANSWEB_420-951/project transweb/alkicorp_banking_sim/banking-sim-api/.cursor/debug.log",
                true)) {
            int afterDeleteCount = clientRepository.findBySlotIdAndBankStateUserId(slotId, user.getId()).size();
            fw.write(
                    "{\"sessionId\":\"debug-session\",\"runId\":\"run1\",\"hypothesisId\":\"H4\",\"location\":\"SimulationService.resetSlot:52\",\"message\":\"Clients after deletion\",\"data\":{\"slotId\":"
                            + slotId + ",\"clientCount\":" + afterDeleteCount + "},\"timestamp\":"
                            + System.currentTimeMillis() + "}\n");
        } catch (IOException e) {
        }
        // #endregion

        // #region agent log
        System.out.println("  → Checking if slot " + slotId + " already exists in database...");
        try (FileWriter fw = new FileWriter(
                "/Users/alkicorp/Documents/ALKIcorp/B5_CLASSES/TRANSWEB_420-951/project transweb/alkicorp_banking_sim/banking-sim-api/.cursor/debug.log",
                true)) {
            fw.write(
                    "{\"sessionId\":\"debug-session\",\"runId\":\"post-fix\",\"hypothesisId\":\"H1,H4\",\"location\":\"SimulationService.resetSlot:51\",\"message\":\"Before findBySlotId\",\"data\":{\"slotId\":\""
                            + slotId + "\"},\"timestamp\":" + System.currentTimeMillis() + "}\n");
        } catch (IOException e) {
        }
        // #endregion
        Optional<BankState> existingStateOpt = bankStateRepository.findBySlotIdAndUserId(slotId, user.getId());
        // #region agent log
        if (existingStateOpt.isPresent()) {
            System.out.println("  ✓ Found existing bank state for slot " + slotId + " (ID: "
                    + existingStateOpt.get().getId() + ") - will update it");
        } else {
            System.out.println("  ✓ No existing bank state found for slot " + slotId + " - will create a new one");
        }
        try (FileWriter fw = new FileWriter(
                "/Users/alkicorp/Documents/ALKIcorp/B5_CLASSES/TRANSWEB_420-951/project transweb/alkicorp_banking_sim/banking-sim-api/.cursor/debug.log",
                true)) {
            fw.write(
                    "{\"sessionId\":\"debug-session\",\"runId\":\"post-fix\",\"hypothesisId\":\"H1,H4\",\"location\":\"SimulationService.resetSlot:52\",\"message\":\"After findBySlotId\",\"data\":{\"slotId\":\""
                            + slotId + "\",\"found\":" + existingStateOpt.isPresent() + ",\"existingId\":"
                            + (existingStateOpt.isPresent() ? existingStateOpt.get().getId() : "null")
                            + "},\"timestamp\":" + System.currentTimeMillis() + "}\n");
        } catch (IOException e) {
        }
        // #endregion
        BankState state = existingStateOpt.orElseGet(() -> {
            // #region agent log
            System.out.println("  → Creating new bank state object for slot " + slotId);
            try (FileWriter fw = new FileWriter(
                    "/Users/alkicorp/Documents/ALKIcorp/B5_CLASSES/TRANSWEB_420-951/project transweb/alkicorp_banking_sim/banking-sim-api/.cursor/debug.log",
                    true)) {
                fw.write(
                        "{\"sessionId\":\"debug-session\",\"runId\":\"post-fix\",\"hypothesisId\":\"H3\",\"location\":\"SimulationService.resetSlot:53\",\"message\":\"Creating new BankState\",\"data\":{\"slotId\":\""
                                + slotId + "\"},\"timestamp\":" + System.currentTimeMillis() + "}\n");
            } catch (IOException e) {
            }
            // #endregion
            return new BankState();
        });
        // #region agent log
        if (state.getId() == null) {
            System.out.println("  → Preparing to INSERT new bank state (no ID yet) for slot " + slotId);
        } else {
            System.out.println(
                    "  → Preparing to UPDATE existing bank state (ID: " + state.getId() + ") for slot " + slotId);
        }
        try (FileWriter fw = new FileWriter(
                "/Users/alkicorp/Documents/ALKIcorp/B5_CLASSES/TRANSWEB_420-951/project transweb/alkicorp_banking_sim/banking-sim-api/.cursor/debug.log",
                true)) {
            fw.write(
                    "{\"sessionId\":\"debug-session\",\"runId\":\"post-fix\",\"hypothesisId\":\"H3\",\"location\":\"SimulationService.resetSlot:54\",\"message\":\"State before setSlotId\",\"data\":{\"stateId\":"
                            + (state.getId() != null ? state.getId() : "null") + ",\"slotId\":\"" + slotId
                            + "\",\"isNew\":\"" + (state.getId() == null) + "\"},\"timestamp\":"
                            + System.currentTimeMillis() + "}\n");
        } catch (IOException e) {
        }
        // #endregion
        state.setSlotId(slotId);
        state.setUser(user);
        state.setLiquidCash(STARTING_CASH);
        state.setInvestedSp500(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        state.setSp500Price(SimulationConstants.SP500_INITIAL_PRICE);
        state.setMortgageRate(BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP));
        state.setGameDay(0d);
        state.setLastUpdateTimestamp(Instant.now(clock));
        state.setNextDividendDay(SimulationConstants.DAYS_PER_YEAR - 1);
        state.setNextGrowthDay(SimulationConstants.DAYS_PER_YEAR - 1);
        // #region agent log
        System.out.println("  → Saving bank state to database for slot " + slotId
                + (state.getId() == null ? " (new record)" : " (updating existing record ID: " + state.getId() + ")"));
        try (FileWriter fw = new FileWriter(
                "/Users/alkicorp/Documents/ALKIcorp/B5_CLASSES/TRANSWEB_420-951/project transweb/alkicorp_banking_sim/banking-sim-api/.cursor/debug.log",
                true)) {
            fw.write(
                    "{\"sessionId\":\"debug-session\",\"runId\":\"post-fix\",\"hypothesisId\":\"H3\",\"location\":\"SimulationService.resetSlot:62\",\"message\":\"Before save\",\"data\":{\"stateId\":"
                            + (state.getId() != null ? state.getId() : "null") + ",\"slotId\":\"" + slotId
                            + "\",\"willInsert\":\"" + (state.getId() == null) + "\"},\"timestamp\":"
                            + System.currentTimeMillis() + "}\n");
        } catch (IOException e) {
        }
        // #endregion
        BankState saved = bankStateRepository.save(state);
        // #region agent log
        System.out.println("  ✓ Successfully saved bank state (ID: " + saved.getId() + ") for slot " + slotId);
        try (FileWriter fw = new FileWriter(
                "/Users/alkicorp/Documents/ALKIcorp/B5_CLASSES/TRANSWEB_420-951/project transweb/alkicorp_banking_sim/banking-sim-api/.cursor/debug.log",
                true)) {
            fw.write(
                    "{\"sessionId\":\"debug-session\",\"runId\":\"post-fix\",\"hypothesisId\":\"H1,H2,H3\",\"location\":\"SimulationService.resetSlot:63\",\"message\":\"After save success\",\"data\":{\"savedId\":"
                            + saved.getId() + ",\"slotId\":\"" + slotId + "\"},\"timestamp\":"
                            + System.currentTimeMillis() + "}\n");
        } catch (IOException e) {
        }
        // #endregion
        return saved;
    }

    @Transactional
    public Optional<BankState> getAndAdvanceState(User user, int slotId) {
        return bankStateRepository.findBySlotIdAndUserId(slotId, user.getId())
                .map(this::advanceTime);
    }

    @Transactional
    public List<BankState> listAndAdvanceSlots(User user, List<Integer> slotIds) {
        List<BankState> results = new ArrayList<>();
        for (Integer slotId : slotIds) {
            getAndAdvanceState(user, slotId).ifPresent(results::add);
        }
        return results;
    }

    private BankState advanceTime(BankState state) {
        Instant now = Instant.now(clock);
        Instant last = Optional.ofNullable(state.getLastUpdateTimestamp()).orElse(now);
        long elapsedMillis = Duration.between(last, now).toMillis();
        double elapsedGameDays = elapsedMillis / (double) SimulationConstants.REAL_MS_PER_GAME_DAY;

        double previousDayValue = Optional.ofNullable(state.getGameDay()).orElse(0d);
        int previousWholeDay = (int) Math.floor(previousDayValue);
        double newDayValue = previousDayValue + elapsedGameDays;
        int currentWholeDay = (int) Math.floor(newDayValue);

        state.setGameDay(newDayValue);
        state.setLastUpdateTimestamp(now);

        if (currentWholeDay > previousWholeDay) {
            List<Client> clients = Objects.requireNonNull(
                    Optional.ofNullable(
                            clientRepository.findBySlotIdAndBankStateUserId(state.getSlotId(), state.getUser().getId()))
                            .orElse(Collections.emptyList()),
                    "Clients list cannot be null");
            for (int day = previousWholeDay + 1; day <= currentWholeDay; day++) {
                processMonthlyLiquidCashGrowth(state);
                if ((day + 1) % SimulationConstants.DAYS_PER_YEAR == 0) {
                    processSp500Growth(state, day);
                    processSp500Dividend(state, day);
                }
                for (Client client : clients) {
                    client.setDailyWithdrawn(BigDecimal.ZERO);
                }
                rentService.chargeRent(state.getSlotId(), state.getUser().getId(), day);
                processLoanRepayments(state, day);
                processMortgageRepayments(state, day);
                final int dayValue = day; // capture loop value for lambda use
                clients.forEach(c -> spendingService.generateSpending(state.getSlotId(), c.getId(), dayValue));
                bankruptcyService.checkDischarge(state.getSlotId(), newDayValue);
            }
        }
        // Run payroll with the fractional clock to support more granular triggers
        // and catch up if time was skipped.
        payrollService.runPayroll(state.getSlotId(), state.getUser().getId(), newDayValue);

        return bankStateRepository.save(state);
    }

    private void processMonthlyLiquidCashGrowth(BankState state) {
        BigDecimal currentCash = state.getLiquidCash();
        if (currentCash == null || currentCash.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        BigDecimal growthAmount = currentCash.multiply(SimulationConstants.LIQUID_CASH_MONTHLY_GROWTH)
                .setScale(2, RoundingMode.HALF_UP);
        state.setLiquidCash(currentCash.add(growthAmount));
    }

    private void processSp500Growth(BankState state, int day) {
        BigDecimal invested = state.getInvestedSp500();
        if (invested.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal growthAmount = invested.multiply(SimulationConstants.SP500_ANNUAL_GROWTH)
                    .setScale(2, RoundingMode.HALF_UP);
            state.setInvestedSp500(invested.add(growthAmount));
            recordInvestmentEvent(state.getSlotId(), state.getUser(), InvestmentEventType.GROWTH, growthAmount, day);
        }
        state.setNextGrowthDay(day + SimulationConstants.DAYS_PER_YEAR);
    }

    private void processSp500Dividend(BankState state, int day) {
        BigDecimal invested = state.getInvestedSp500();
        if (invested.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal dividendAmount = invested.multiply(SimulationConstants.SP500_ANNUAL_DIVIDEND)
                    .setScale(2, RoundingMode.HALF_UP);
            state.setLiquidCash(state.getLiquidCash().add(dividendAmount));
            recordInvestmentEvent(state.getSlotId(), state.getUser(), InvestmentEventType.DIVIDEND, dividendAmount,
                    day);
        }
        state.setNextDividendDay(day + SimulationConstants.DAYS_PER_YEAR);
    }

    private void processLoanRepayments(BankState state, int day) {
        List<Loan> loans = loanRepository.findBySlotIdAndUserId(state.getSlotId(), state.getUser().getId());
        for (Loan loan : loans) {
            if (loan.getNextPaymentDay() == null || loan.getMonthlyPayment() == null) {
                continue;
            }
            if (loan.getStatus() != com.alkicorp.bankingsim.model.enums.LoanStatus.APPROVED) {
                continue;
            }
            if (day < loan.getNextPaymentDay()) {
                continue;
            }
            Client client = loan.getClient();
            BigDecimal amountDue = loan.getMonthlyPayment();
            BigDecimal payAmount = client.getCheckingBalance().min(amountDue);
            Instant now = Instant.now(clock);
            if (payAmount.compareTo(BigDecimal.ZERO) > 0) {
                client.setCheckingBalance(client.getCheckingBalance().subtract(payAmount));
                Transaction tx = new Transaction();
                tx.setClient(client);
                tx.setType(TransactionType.PERSONAL_LOAN_PAYMENT);
                tx.setAmount(payAmount.setScale(2, RoundingMode.HALF_UP));
                tx.setGameDay(day);
                tx.setCreatedAt(now);
                transactionRepository.save(tx);
                state.setLiquidCash(state.getLiquidCash().add(payAmount));
                loan.setLastPaymentStatus(payAmount.compareTo(amountDue) >= 0 ? "PAID" : "PARTIAL");
                if (payAmount.compareTo(amountDue) < 0) {
                    loan.setMissedPayments(loan.getMissedPayments() + 1);
                }
            } else {
                loan.setLastPaymentStatus("MISSED");
                loan.setMissedPayments(loan.getMissedPayments() + 1);
            }
            loan.setNextPaymentDay(day + SimulationConstants.REPAYMENT_PERIOD_DAYS);
            loan.setUpdatedAt(now);
            loanRepository.save(loan);
            clientRepository.save(client);
        }
    }

    private void processMortgageRepayments(BankState state, int day) {
        List<Mortgage> mortgages = mortgageRepository.findBySlotIdAndUserId(state.getSlotId(), state.getUser().getId());
        mortgages.sort(java.util.Comparator
                .comparing(Mortgage::getUpdatedAt, java.util.Comparator.nullsLast(java.util.Comparator.naturalOrder()))
                .reversed());
        java.util.Set<Long> paidProductIds = new java.util.HashSet<>();
        for (Mortgage mortgage : mortgages) {
            if (mortgage.getNextPaymentDay() == null || mortgage.getMonthlyPayment() == null) {
                continue;
            }
            if (mortgage.getStatus() != com.alkicorp.bankingsim.model.enums.MortgageStatus.ACCEPTED) {
                continue;
            }
            if (mortgage.getProduct() == null
                    || mortgage.getProduct().getStatus() != com.alkicorp.bankingsim.model.enums.ProductStatus.OWNED
                    || mortgage.getProduct().getOwnerClient() == null
                    || mortgage.getProduct().getOwnerClient().getId() == null
                    || !mortgage.getProduct().getOwnerClient().getId().equals(mortgage.getClient().getId())) {
                continue;
            }
            Long productId = mortgage.getProduct().getId();
            if (productId != null && paidProductIds.contains(productId)) {
                continue;
            }
            if (day < mortgage.getNextPaymentDay()) {
                continue;
            }
            Client client = mortgage.getClient();
            BigDecimal amountDue = mortgage.getMonthlyPayment();
            BigDecimal payAmount = client.getCheckingBalance().min(amountDue);
            Instant now = Instant.now(clock);
            if (payAmount.compareTo(BigDecimal.ZERO) > 0) {
                client.setCheckingBalance(client.getCheckingBalance().subtract(payAmount));
                Transaction tx = new Transaction();
                tx.setClient(client);
                tx.setType(TransactionType.MORTGAGE_PAYMENT);
                tx.setAmount(payAmount.setScale(2, RoundingMode.HALF_UP));
                tx.setGameDay(day);
                tx.setCreatedAt(now);
                transactionRepository.save(tx);
                state.setLiquidCash(state.getLiquidCash().add(payAmount));
                mortgage.setLastPaymentStatus(payAmount.compareTo(amountDue) >= 0 ? "PAID" : "PARTIAL");
                if (payAmount.compareTo(amountDue) < 0) {
                    mortgage.setMissedPayments(mortgage.getMissedPayments() + 1);
                }
            } else {
                mortgage.setLastPaymentStatus("MISSED");
                mortgage.setMissedPayments(mortgage.getMissedPayments() + 1);
            }
            mortgage.setNextPaymentDay(day + SimulationConstants.REPAYMENT_PERIOD_DAYS);
            mortgage.setUpdatedAt(now);
            mortgageRepository.save(mortgage);
            clientRepository.save(client);
            if (productId != null) {
                paidProductIds.add(productId);
            }
        }
    }

    private void recordInvestmentEvent(int slotId, User user, InvestmentEventType type, BigDecimal amount,
            int gameDay) {
        InvestmentEvent event = new InvestmentEvent();
        event.setSlotId(slotId);
        event.setUser(user);
        event.setType(type);
        event.setAsset("S&P 500");
        event.setAmount(amount);
        event.setGameDay(gameDay);
        event.setCreatedAt(Instant.now(clock));
        investmentEventRepository.save(event);
    }
}
