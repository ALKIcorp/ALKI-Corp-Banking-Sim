package com.alkicorp.bankingsim.service;

import com.alkicorp.bankingsim.auth.model.User;
import com.alkicorp.bankingsim.auth.service.CurrentUserService;
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
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class InvestmentService {

    private final SimulationService simulationService;
    private final BankStateRepository bankStateRepository;
    private final InvestmentEventRepository investmentEventRepository;
    private final CurrentUserService currentUserService;
    private final Clock clock = Clock.systemUTC();

    @Transactional(readOnly = true)
    public BankState getInvestmentState(int slotId) {
        User user = currentUserService.getCurrentUser();
        return simulationService.getAndAdvanceState(user, slotId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, 
                "Bank state not found for slot " + slotId + ". Use POST /api/slots/" + slotId + "/start to initialize the slot."));
    }

    @Transactional
    public BankState investInSp500(int slotId, BigDecimal amount) {
        validateAmount(amount);
        User user = currentUserService.getCurrentUser();
        BankState state = simulationService.getAndAdvanceState(user, slotId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, 
                "Bank state not found for slot " + slotId + ". Use POST /api/slots/" + slotId + "/start to initialize the slot."));
        if (amount.compareTo(state.getLiquidCash()) > 0) {
            throw new ValidationException("Insufficient liquid cash.");
        }
        state.setLiquidCash(state.getLiquidCash().subtract(amount));
        state.setInvestedSp500(state.getInvestedSp500().add(amount));
        bankStateRepository.save(state);
        saveEvent(slotId, user, InvestmentEventType.INVEST, amount, state);
        return state;
    }

    @Transactional
    public BankState divestFromSp500(int slotId, BigDecimal amount) {
        validateAmount(amount);
        User user = currentUserService.getCurrentUser();
        BankState state = simulationService.getAndAdvanceState(user, slotId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, 
                "Bank state not found for slot " + slotId + ". Use POST /api/slots/" + slotId + "/start to initialize the slot."));
        if (amount.compareTo(state.getInvestedSp500()) > 0) {
            throw new ValidationException("Cannot divest more than invested.");
        }
        state.setInvestedSp500(state.getInvestedSp500().subtract(amount));
        state.setLiquidCash(state.getLiquidCash().add(amount));
        bankStateRepository.save(state);
        saveEvent(slotId, user, InvestmentEventType.DIVEST, amount, state);
        return state;
    }

    private void saveEvent(int slotId, User user, InvestmentEventType type, BigDecimal amount, BankState state) {
        InvestmentEvent event = new InvestmentEvent();
        event.setSlotId(slotId);
        event.setUser(user);
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
