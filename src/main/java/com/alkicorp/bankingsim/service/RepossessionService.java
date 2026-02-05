package com.alkicorp.bankingsim.service;

import com.alkicorp.bankingsim.auth.model.User;
import com.alkicorp.bankingsim.auth.service.CurrentUserService;
import com.alkicorp.bankingsim.model.BankState;
import com.alkicorp.bankingsim.model.Client;
import com.alkicorp.bankingsim.model.RepossessionEvent;
import com.alkicorp.bankingsim.model.enums.AssetType;
import com.alkicorp.bankingsim.model.enums.RepossessionReason;
import com.alkicorp.bankingsim.repository.ClientRepository;
import com.alkicorp.bankingsim.repository.RepossessionEventRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RepossessionService {

    private final RepossessionEventRepository repossessionEventRepository;
    private final ClientRepository clientRepository;
    private final SimulationService simulationService;
    private final CurrentUserService currentUserService;
    private final Clock clock = Clock.systemUTC();

    @Transactional
    public void record(int slotId, Client client, AssetType assetType, Long assetId, RepossessionReason reason, BigDecimal writtenOff) {
        User user = currentUserService.getCurrentUser();
        BankState state = simulationService.getAndAdvanceState(user, slotId).orElse(null);
        int gameDay = state != null ? (int) Math.floor(state.getGameDay()) : 0;
        RepossessionEvent event = new RepossessionEvent();
        event.setClient(client);
        event.setSlotId(slotId);
        event.setAssetType(assetType);
        event.setAssetId(assetId);
        event.setReason(reason);
        event.setGameDay(gameDay);
        event.setBalanceWrittenOff(writtenOff);
        event.setCreatedAt(Instant.now(clock));
        repossessionEventRepository.save(event);
    }

    @Transactional(readOnly = true)
    public List<RepossessionEvent> listBySlot(int slotId) {
        return repossessionEventRepository.findBySlotId(slotId);
    }
}
