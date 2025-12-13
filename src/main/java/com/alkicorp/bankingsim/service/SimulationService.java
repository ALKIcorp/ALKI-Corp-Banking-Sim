package com.alkicorp.bankingsim.service;

import com.alkicorp.bankingsim.model.BankState;
import com.alkicorp.bankingsim.model.Client;
import com.alkicorp.bankingsim.model.InvestmentEvent;
import com.alkicorp.bankingsim.model.enums.InvestmentEventType;
import com.alkicorp.bankingsim.repository.BankStateRepository;
import com.alkicorp.bankingsim.repository.ClientRepository;
import com.alkicorp.bankingsim.repository.InvestmentEventRepository;
import com.alkicorp.bankingsim.repository.TransactionRepository;
import java.io.FileWriter;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
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
    private final Clock clock = Clock.systemUTC();

    @Transactional
    public BankState resetSlot(int slotId) {
        // #region agent log
        System.out.println("  → Resetting slot " + slotId + " (clearing existing data and preparing fresh state)");
        try (FileWriter fw = new FileWriter("/Users/alkicorp/Documents/ALKIcorp/B5_CLASSES/TRANSWEB_420-951/project/alkicorp_banking_sim/banking-sim-api/.cursor/debug.log", true)) {
            fw.write("{\"sessionId\":\"debug-session\",\"runId\":\"run1\",\"hypothesisId\":\"H1,H2,H3\",\"location\":\"SimulationService.resetSlot:36\",\"message\":\"resetSlot entry\",\"data\":{\"slotId\":\"" + slotId + "\"},\"timestamp\":" + System.currentTimeMillis() + "}\n");
        } catch (IOException e) {}
        // #endregion
        List<Client> clients = clientRepository.findBySlotId(slotId);
        if (!clients.isEmpty()) {
            transactionRepository.deleteByClientIn(clients);
        }
        clientRepository.deleteBySlotId(slotId);
        investmentEventRepository.deleteBySlotId(slotId);

        // #region agent log
        System.out.println("  → Checking if slot " + slotId + " already exists in database...");
        try (FileWriter fw = new FileWriter("/Users/alkicorp/Documents/ALKIcorp/B5_CLASSES/TRANSWEB_420-951/project/alkicorp_banking_sim/banking-sim-api/.cursor/debug.log", true)) {
            fw.write("{\"sessionId\":\"debug-session\",\"runId\":\"post-fix\",\"hypothesisId\":\"H1,H4\",\"location\":\"SimulationService.resetSlot:51\",\"message\":\"Before findBySlotId\",\"data\":{\"slotId\":\"" + slotId + "\"},\"timestamp\":" + System.currentTimeMillis() + "}\n");
        } catch (IOException e) {}
        // #endregion
        Optional<BankState> existingStateOpt = bankStateRepository.findBySlotId(slotId);
        // #region agent log
        if (existingStateOpt.isPresent()) {
            System.out.println("  ✓ Found existing bank state for slot " + slotId + " (ID: " + existingStateOpt.get().getId() + ") - will update it");
        } else {
            System.out.println("  ✓ No existing bank state found for slot " + slotId + " - will create a new one");
        }
        try (FileWriter fw = new FileWriter("/Users/alkicorp/Documents/ALKIcorp/B5_CLASSES/TRANSWEB_420-951/project/alkicorp_banking_sim/banking-sim-api/.cursor/debug.log", true)) {
            fw.write("{\"sessionId\":\"debug-session\",\"runId\":\"post-fix\",\"hypothesisId\":\"H1,H4\",\"location\":\"SimulationService.resetSlot:52\",\"message\":\"After findBySlotId\",\"data\":{\"slotId\":\"" + slotId + "\",\"found\":" + existingStateOpt.isPresent() + ",\"existingId\":" + (existingStateOpt.isPresent() ? existingStateOpt.get().getId() : "null") + "},\"timestamp\":" + System.currentTimeMillis() + "}\n");
        } catch (IOException e) {}
        // #endregion
        BankState state = existingStateOpt.orElseGet(() -> {
            // #region agent log
            System.out.println("  → Creating new bank state object for slot " + slotId);
            try (FileWriter fw = new FileWriter("/Users/alkicorp/Documents/ALKIcorp/B5_CLASSES/TRANSWEB_420-951/project/alkicorp_banking_sim/banking-sim-api/.cursor/debug.log", true)) {
                fw.write("{\"sessionId\":\"debug-session\",\"runId\":\"post-fix\",\"hypothesisId\":\"H3\",\"location\":\"SimulationService.resetSlot:53\",\"message\":\"Creating new BankState\",\"data\":{\"slotId\":\"" + slotId + "\"},\"timestamp\":" + System.currentTimeMillis() + "}\n");
            } catch (IOException e) {}
            // #endregion
            return new BankState();
        });
        // #region agent log
        if (state.getId() == null) {
            System.out.println("  → Preparing to INSERT new bank state (no ID yet) for slot " + slotId);
        } else {
            System.out.println("  → Preparing to UPDATE existing bank state (ID: " + state.getId() + ") for slot " + slotId);
        }
        try (FileWriter fw = new FileWriter("/Users/alkicorp/Documents/ALKIcorp/B5_CLASSES/TRANSWEB_420-951/project/alkicorp_banking_sim/banking-sim-api/.cursor/debug.log", true)) {
            fw.write("{\"sessionId\":\"debug-session\",\"runId\":\"post-fix\",\"hypothesisId\":\"H3\",\"location\":\"SimulationService.resetSlot:54\",\"message\":\"State before setSlotId\",\"data\":{\"stateId\":" + (state.getId() != null ? state.getId() : "null") + ",\"slotId\":\"" + slotId + "\",\"isNew\":\"" + (state.getId() == null) + "\"},\"timestamp\":" + System.currentTimeMillis() + "}\n");
        } catch (IOException e) {}
        // #endregion
        state.setSlotId(slotId);
        state.setLiquidCash(STARTING_CASH);
        state.setInvestedSp500(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        state.setSp500Price(SimulationConstants.SP500_INITIAL_PRICE);
        state.setGameDay(0d);
        state.setLastUpdateTimestamp(Instant.now(clock));
        state.setNextDividendDay(SimulationConstants.DAYS_PER_YEAR - 1);
        state.setNextGrowthDay(SimulationConstants.DAYS_PER_YEAR - 1);
        // #region agent log
        System.out.println("  → Saving bank state to database for slot " + slotId + (state.getId() == null ? " (new record)" : " (updating existing record ID: " + state.getId() + ")"));
        try (FileWriter fw = new FileWriter("/Users/alkicorp/Documents/ALKIcorp/B5_CLASSES/TRANSWEB_420-951/project/alkicorp_banking_sim/banking-sim-api/.cursor/debug.log", true)) {
            fw.write("{\"sessionId\":\"debug-session\",\"runId\":\"post-fix\",\"hypothesisId\":\"H3\",\"location\":\"SimulationService.resetSlot:62\",\"message\":\"Before save\",\"data\":{\"stateId\":" + (state.getId() != null ? state.getId() : "null") + ",\"slotId\":\"" + slotId + "\",\"willInsert\":\"" + (state.getId() == null) + "\"},\"timestamp\":" + System.currentTimeMillis() + "}\n");
        } catch (IOException e) {}
        // #endregion
        BankState saved = bankStateRepository.save(state);
        // #region agent log
        System.out.println("  ✓ Successfully saved bank state (ID: " + saved.getId() + ") for slot " + slotId);
        try (FileWriter fw = new FileWriter("/Users/alkicorp/Documents/ALKIcorp/B5_CLASSES/TRANSWEB_420-951/project/alkicorp_banking_sim/banking-sim-api/.cursor/debug.log", true)) {
            fw.write("{\"sessionId\":\"debug-session\",\"runId\":\"post-fix\",\"hypothesisId\":\"H1,H2,H3\",\"location\":\"SimulationService.resetSlot:63\",\"message\":\"After save success\",\"data\":{\"savedId\":" + saved.getId() + ",\"slotId\":\"" + slotId + "\"},\"timestamp\":" + System.currentTimeMillis() + "}\n");
        } catch (IOException e) {}
        // #endregion
        return saved;
    }

    @Transactional
    public BankState getAndAdvanceState(int slotId) {
        BankState state = bankStateRepository.findBySlotId(slotId).orElseGet(() -> resetSlot(slotId));
        return advanceTime(state);
    }

    @Transactional
    public List<BankState> listAndAdvanceSlots(List<Integer> slotIds) {
        List<BankState> results = new ArrayList<>();
        for (Integer slotId : slotIds) {
            results.add(getAndAdvanceState(slotId));
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
            List<Client> clients = clientRepository.findBySlotId(state.getSlotId());
            boolean clientUpdated = false;
            for (int day = previousWholeDay + 1; day <= currentWholeDay; day++) {
                if ((day + 1) % SimulationConstants.DAYS_PER_YEAR == 0) {
                    processSp500Growth(state, day);
                    processSp500Dividend(state, day);
                }
                for (Client client : clients) {
                    client.setDailyWithdrawn(BigDecimal.ZERO);
                    clientUpdated = true;
                }
            }
            if (clientUpdated) {
                clientRepository.saveAll(clients);
            }
        }
        return bankStateRepository.save(state);
    }

    private void processSp500Growth(BankState state, int day) {
        BigDecimal invested = state.getInvestedSp500();
        if (invested.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal growthAmount = invested.multiply(SimulationConstants.SP500_ANNUAL_GROWTH)
                .setScale(2, RoundingMode.HALF_UP);
            state.setInvestedSp500(invested.add(growthAmount));
            recordInvestmentEvent(state.getSlotId(), InvestmentEventType.GROWTH, growthAmount, day);
        }
        state.setNextGrowthDay(day + SimulationConstants.DAYS_PER_YEAR);
    }

    private void processSp500Dividend(BankState state, int day) {
        BigDecimal invested = state.getInvestedSp500();
        if (invested.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal dividendAmount = invested.multiply(SimulationConstants.SP500_ANNUAL_DIVIDEND)
                .setScale(2, RoundingMode.HALF_UP);
            state.setLiquidCash(state.getLiquidCash().add(dividendAmount));
            recordInvestmentEvent(state.getSlotId(), InvestmentEventType.DIVIDEND, dividendAmount, day);
        }
        state.setNextDividendDay(day + SimulationConstants.DAYS_PER_YEAR);
    }

    private void recordInvestmentEvent(int slotId, InvestmentEventType type, BigDecimal amount, int gameDay) {
        InvestmentEvent event = new InvestmentEvent();
        event.setSlotId(slotId);
        event.setType(type);
        event.setAsset("S&P 500");
        event.setAmount(amount);
        event.setGameDay(gameDay);
        event.setCreatedAt(Instant.now(clock));
        investmentEventRepository.save(event);
    }
}
