package com.alkicorp.bankingsim.service;

import com.alkicorp.bankingsim.model.BankState;
import com.alkicorp.bankingsim.model.InvestmentEvent;
import com.alkicorp.bankingsim.model.enums.InvestmentEventType;
import com.alkicorp.bankingsim.repository.BankStateRepository;
import com.alkicorp.bankingsim.repository.InvestmentEventRepository;
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
public class InvestmentService {

    private final SimulationService simulationService;
    private final BankStateRepository bankStateRepository;
    private final InvestmentEventRepository investmentEventRepository;
    private final Clock clock = Clock.systemUTC();

    @Transactional(readOnly = true)
    public BankState getInvestmentState(int slotId) {
        return simulationService.getAndAdvanceState(slotId);
    }

    @Transactional
    public BankState investInSp500(int slotId, BigDecimal amount) {
        validateAmount(amount);
        BankState state = simulationService.getAndAdvanceState(slotId);
        if (amount.compareTo(state.getLiquidCash()) > 0) {
            throw new ValidationException("Insufficient liquid cash.");
        }
        state.setLiquidCash(state.getLiquidCash().subtract(amount));
        state.setInvestedSp500(state.getInvestedSp500().add(amount));
        bankStateRepository.save(state);
        saveEvent(slotId, InvestmentEventType.INVEST, amount, state);
        return state;
    }

    @Transactional
    public BankState divestFromSp500(int slotId, BigDecimal amount) {
        validateAmount(amount);
        BankState state = simulationService.getAndAdvanceState(slotId);
        if (amount.compareTo(state.getInvestedSp500()) > 0) {
            throw new ValidationException("Cannot divest more than invested.");
        }
        state.setInvestedSp500(state.getInvestedSp500().subtract(amount));
        state.setLiquidCash(state.getLiquidCash().add(amount));
        bankStateRepository.save(state);
        saveEvent(slotId, InvestmentEventType.DIVEST, amount, state);
        return state;
    }

    private void saveEvent(int slotId, InvestmentEventType type, BigDecimal amount, BankState state) {
        InvestmentEvent event = new InvestmentEvent();
        event.setSlotId(slotId);
        event.setType(type);
        event.setAsset("S&P 500");
        event.setAmount(amount.setScale(2, RoundingMode.HALF_UP));
        event.setGameDay((int) Math.floor(state.getGameDay()));
        event.setCreatedAt(Instant.now(clock));
        investmentEventRepository.save(event);
    }

    private void validateAmount(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ValidationException("Invalid amount.");
        }
    }
}
