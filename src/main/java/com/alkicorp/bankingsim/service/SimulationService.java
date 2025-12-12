package com.alkicorp.bankingsim.service;

import com.alkicorp.bankingsim.model.BankState;
import com.alkicorp.bankingsim.model.Client;
import com.alkicorp.bankingsim.model.InvestmentEvent;
import com.alkicorp.bankingsim.model.enums.InvestmentEventType;
import com.alkicorp.bankingsim.repository.BankStateRepository;
import com.alkicorp.bankingsim.repository.ClientRepository;
import com.alkicorp.bankingsim.repository.InvestmentEventRepository;
import com.alkicorp.bankingsim.repository.TransactionRepository;
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
        List<Client> clients = clientRepository.findBySlotId(slotId);
        if (!clients.isEmpty()) {
            transactionRepository.deleteByClientIn(clients);
        }
        clientRepository.deleteBySlotId(slotId);
        investmentEventRepository.deleteBySlotId(slotId);

        BankState state = bankStateRepository.findBySlotId(slotId).orElse(new BankState());
        state.setSlotId(slotId);
        state.setLiquidCash(STARTING_CASH);
        state.setInvestedSp500(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        state.setSp500Price(SimulationConstants.SP500_INITIAL_PRICE);
        state.setGameDay(0d);
        state.setLastUpdateTimestamp(Instant.now(clock));
        state.setNextDividendDay(SimulationConstants.DAYS_PER_YEAR - 1);
        state.setNextGrowthDay(SimulationConstants.DAYS_PER_YEAR - 1);
        return bankStateRepository.save(state);
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
