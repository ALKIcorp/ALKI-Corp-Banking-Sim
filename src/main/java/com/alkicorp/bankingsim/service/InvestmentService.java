package com.alkicorp.bankingsim.service;

import com.alkicorp.bankingsim.auth.model.User;
import com.alkicorp.bankingsim.auth.service.CurrentUserService;
import com.alkicorp.bankingsim.model.BankState;
import com.alkicorp.bankingsim.model.InvestmentEvent;
import com.alkicorp.bankingsim.model.enums.InvestmentEventType;
import com.alkicorp.bankingsim.model.enums.TransactionType;
import com.alkicorp.bankingsim.repository.BankStateRepository;
import com.alkicorp.bankingsim.repository.ClientRepository;
import com.alkicorp.bankingsim.repository.InvestmentEventRepository;
import com.alkicorp.bankingsim.repository.TransactionRepository;
import com.alkicorp.bankingsim.web.dto.InvestmentEventResponse;
import com.alkicorp.bankingsim.web.dto.InvestmentStateResponse;
import com.alkicorp.bankingsim.web.dto.RepaymentIncomeResponse;
import jakarta.validation.ValidationException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
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
    private final ClientRepository clientRepository;
    private final TransactionRepository transactionRepository;
    private final CurrentUserService currentUserService;
    private final Clock clock = Clock.systemUTC();

    @Transactional(readOnly = true)
    public BankState getInvestmentState(int slotId) {
        User user = currentUserService.getCurrentUser();
        return simulationService.getAndAdvanceState(user, slotId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, 
                "Bank state not found for slot " + slotId + ". Use POST /api/slots/" + slotId + "/start to initialize the slot."));
    }

    @Transactional(readOnly = true)
    public InvestmentStateResponse getInvestmentStateResponse(int slotId) {
        BankState state = getInvestmentState(slotId);
        return buildResponse(state);
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
    public InvestmentStateResponse investInSp500AndSummarize(int slotId, BigDecimal amount) {
        BankState state = investInSp500(slotId, amount);
        return buildResponse(state);
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

    @Transactional
    public InvestmentStateResponse divestFromSp500AndSummarize(int slotId, BigDecimal amount) {
        BankState state = divestFromSp500(slotId, amount);
        return buildResponse(state);
    }

    private InvestmentStateResponse buildResponse(BankState state) {
        User user = state.getUser();
        int slotId = state.getSlotId();
        int currentDay = (int) Math.floor(state.getGameDay());

        List<InvestmentEventResponse> history = investmentEventRepository.findBySlotIdAndUserId(slotId, user.getId()).stream()
            .sorted(Comparator.comparing(InvestmentEvent::getCreatedAt).reversed())
            .map(event -> InvestmentEventResponse.builder()
                .type(event.getType().name())
                .asset(event.getAsset())
                .amount(event.getAmount())
                .gameDay(event.getGameDay())
                .createdAt(event.getCreatedAt())
                .build())
            .toList();

        List<RepaymentIncomeResponse> repayments = buildRepaymentIncome(slotId, user, currentDay);

        BigDecimal repaymentTotal = repayments.stream()
            .map(RepaymentIncomeResponse::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal repaymentCurrentMonth = repayments.stream()
            .filter(r -> r.getGameDay() >= Math.max(0, currentDay - 30))
            .map(RepaymentIncomeResponse::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        return InvestmentStateResponse.builder()
            .liquidCash(state.getLiquidCash())
            .investedSp500(state.getInvestedSp500())
            .sp500Price(state.getSp500Price())
            .nextDividendDay(state.getNextDividendDay())
            .nextGrowthDay(state.getNextGrowthDay())
            .gameDay(state.getGameDay())
            .history(history)
            .repaymentIncome(repayments)
            .repaymentIncomeTotal(repaymentTotal)
            .repaymentIncomeCurrentMonth(repaymentCurrentMonth)
            .build();
    }

    private List<RepaymentIncomeResponse> buildRepaymentIncome(int slotId, User user, int currentDay) {
        var clients = clientRepository.findBySlotIdAndBankStateUserId(slotId, user.getId());
        if (clients.isEmpty()) {
            return List.of();
        }
        var repaymentTypes = List.of(
            TransactionType.MORTGAGE_PAYMENT,
            TransactionType.PERSONAL_LOAN_PAYMENT,
            TransactionType.AUTO_LOAN_PAYMENT,
            TransactionType.CREDIT_CARD_PAYMENT
        );
        return transactionRepository.findByClientInAndTypeInOrderByCreatedAtDesc(clients, repaymentTypes).stream()
            .map(tx -> RepaymentIncomeResponse.builder()
                .clientName(tx.getClient().getName())
                .type(tx.getType())
                .amount(tx.getAmount())
                .gameDay(tx.getGameDay())
                .createdAt(tx.getCreatedAt())
                .build())
            .toList();
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
