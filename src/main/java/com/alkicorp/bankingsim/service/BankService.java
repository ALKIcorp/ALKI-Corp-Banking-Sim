package com.alkicorp.bankingsim.service;

import com.alkicorp.bankingsim.model.BankState;
import com.alkicorp.bankingsim.repository.BankStateRepository;
import com.alkicorp.bankingsim.repository.ClientRepository;
import com.alkicorp.bankingsim.web.dto.BankStateResponse;
import com.alkicorp.bankingsim.web.dto.SlotSummaryResponse;
import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class BankService {

    private final SimulationService simulationService;
    private final BankStateRepository bankStateRepository;
    private final ClientRepository clientRepository;

    @Transactional(readOnly = true)
    public List<SlotSummaryResponse> getSlotSummaries(List<Integer> slots) {
        List<BankState> states = simulationService.listAndAdvanceSlots(slots);
        return states.stream()
            .map(state -> {
                int clientCount = clientRepository.findBySlotId(state.getSlotId()).size();
                boolean hasData = state.getGameDay() > 0 || clientCount > 0;
                return SlotSummaryResponse.builder()
                    .slotId(state.getSlotId())
                    .clientCount(clientCount)
                    .gameDay(state.getGameDay())
                    .liquidCash(state.getLiquidCash())
                    .hasData(hasData)
                    .build();
            })
            .collect(Collectors.toList());
    }

    @Transactional
    public BankStateResponse resetAndGetState(int slotId) {
        BankState state = simulationService.resetSlot(slotId);
        return toResponse(state);
    }

    @Transactional(readOnly = true)
    public BankStateResponse getBankState(int slotId) {
        BankState state = simulationService.getAndAdvanceState(slotId);
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
