package com.alkicorp.bankingsim.service;

import com.alkicorp.bankingsim.auth.model.User;
import com.alkicorp.bankingsim.auth.service.CurrentUserService;
import com.alkicorp.bankingsim.model.BankState;
import com.alkicorp.bankingsim.repository.ClientRepository;
import com.alkicorp.bankingsim.web.dto.BankStateResponse;
import com.alkicorp.bankingsim.web.dto.SlotSummaryResponse;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class BankService {

    private final SimulationService simulationService;
    private final ClientRepository clientRepository;
    private final CurrentUserService currentUserService;

    @Transactional
    public List<SlotSummaryResponse> getSlotSummaries(List<Integer> slots) {
        User user = currentUserService.getCurrentUser();
        List<BankState> states = simulationService.listAndAdvanceSlots(user, slots);
        return slots.stream()
                .map(slotId -> {
                    Optional<BankState> stateOpt = states.stream()
                            .filter(s -> s.getSlotId().equals(slotId))
                            .findFirst();
                    if (stateOpt.isPresent()) {
                        BankState state = stateOpt.get();
                        int clientCount = clientRepository.findBySlotIdAndBankStateUserId(state.getSlotId(), user.getId()).size();
                        boolean hasData = state.getGameDay() > 0 || clientCount > 0;
                        return SlotSummaryResponse.builder()
                                .slotId(state.getSlotId())
                                .clientCount(clientCount)
                                .gameDay(state.getGameDay())
                                .liquidCash(state.getLiquidCash())
                                .hasData(hasData)
                                .build();
                    } else {
                        // Slot has no bank state - return empty summary
                        int clientCount = clientRepository.findBySlotIdAndBankStateUserId(slotId, user.getId()).size();
                        return SlotSummaryResponse.builder()
                                .slotId(slotId)
                                .clientCount(clientCount)
                                .gameDay(0.0)
                                .liquidCash(BigDecimal.ZERO)
                                .hasData(clientCount > 0)
                                .build();
                    }
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public BankStateResponse resetAndGetState(int slotId) {
        User user = currentUserService.getCurrentUser();
        BankState state = simulationService.resetSlot(user, slotId);
        return toResponse(state);
    }

    @Transactional
    public BankStateResponse getBankState(int slotId) {
        User user = currentUserService.getCurrentUser();
        BankState state = simulationService.getAndAdvanceState(user, slotId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Bank state not found for slot " + slotId + ". Use POST /api/slots/" + slotId
                                + "/start to initialize the slot."));
        return toResponse(state);
    }

    private BankStateResponse toResponse(BankState state) {
        BigDecimal totalAssets = state.getLiquidCash().add(state.getInvestedSp500());
        return BankStateResponse.builder()
                .slotId(state.getSlotId())
                .gameDay(state.getGameDay())
                .liquidCash(state.getLiquidCash())
                .investedSp500(state.getInvestedSp500())
                .totalAssets(totalAssets)
                .sp500Price(state.getSp500Price())
                .nextDividendDay(state.getNextDividendDay())
                .nextGrowthDay(state.getNextGrowthDay())
                .build();
    }
}
