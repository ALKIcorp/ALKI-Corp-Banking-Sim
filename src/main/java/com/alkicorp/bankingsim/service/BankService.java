package com.alkicorp.bankingsim.service;

import com.alkicorp.bankingsim.model.BankState;
import com.alkicorp.bankingsim.repository.BankStateRepository;
import com.alkicorp.bankingsim.repository.ClientRepository;
import com.alkicorp.bankingsim.web.dto.BankStateResponse;
import com.alkicorp.bankingsim.web.dto.SlotSummaryResponse;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class BankService {

    private final SimulationService simulationService;
    private final ClientRepository clientRepository;
    private final BankStateRepository bankStateRepository;
    private final JdbcTemplate jdbcTemplate;

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

    /**
     * Seeds slot 1 with pre-configured data (5 clients, 14 transactions, bank state).
     * This method replicates the Liquibase changeset 10-seed-slot-1-data functionality.
     * Can be called via API endpoint to restore seed data after it's been deleted.
     */
    @Transactional
    public BankStateResponse seedSlot1Data() {
        // Ensure bank_state exists for slot 1
        BankState bankState = bankStateRepository.findBySlotId(1)
            .orElseThrow(() -> new IllegalStateException("Bank state for slot 1 must exist before seeding"));

        // Update bank_state for slot 1 with seed data
        jdbcTemplate.update(
            "UPDATE bank_state SET liquid_cash = ?, invested_sp500 = ?, sp500_price = ?, " +
            "game_day = ?, next_dividend_day = ?, next_growth_day = ?, last_update_timestamp = ? WHERE slot_id = 1",
            250000.00, 50000.00, 4750.00, 12.0, 21, 18,
            Instant.parse("2024-01-13T00:00:00Z")
        );

        // Insert clients for slot 1
        String[] clientNames = {
            "Starboy The Ponderer", "Maison Alkibiades", "Mason Bramadat", 
            "Hal Gibert", "Rosemont Runner"
        };
        BigDecimal[] balances = {
            new BigDecimal("12800.00"), new BigDecimal("34250.00"), new BigDecimal("5150.00"),
            new BigDecimal("60200.00"), new BigDecimal("2750.00")
        };
        BigDecimal[] dailyWithdrawn = {
            new BigDecimal("200.00"), BigDecimal.ZERO, new BigDecimal("50.00"),
            BigDecimal.ZERO, new BigDecimal("120.00")
        };
        String[] cardNumbers = {
            "4532 2047 1100 9001", "5555 2047 2200 9002", "4532 2047 3300 9003",
            "5555 2047 4400 9004", "4532 2047 5500 9005"
        };
        String[] cardExpiries = {"10/27", "03/28", "07/26", "12/29", "01/28"};
        String[] cardCvvs = {"247", "318", "909", "612", "505"};
        String[] createdDates = {
            "2024-01-01T00:00:00Z", "2024-01-02T00:00:00Z", "2024-01-03T00:00:00Z",
            "2024-01-04T00:00:00Z", "2024-01-05T00:00:00Z"
        };

        for (int i = 0; i < clientNames.length; i++) {
            jdbcTemplate.update(
                "INSERT INTO client (bank_state_id, slot_id, name, checking_balance, daily_withdrawn, " +
                "card_number, card_expiry, card_cvv, created_at) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?)",
                bankState.getId(), clientNames[i], balances[i], dailyWithdrawn[i],
                cardNumbers[i], cardExpiries[i], cardCvvs[i], Instant.parse(createdDates[i])
            );
        }

        // Insert transactions
        // Starboy The Ponderer transactions
        Long starboyId = jdbcTemplate.queryForObject(
            "SELECT id FROM client WHERE slot_id = 1 AND name = 'Starboy The Ponderer'", Long.class
        );
        jdbcTemplate.update(
            "INSERT INTO client_transaction (client_id, type, amount, game_day, created_at) VALUES (?, 'DEPOSIT', ?, ?, ?)",
            starboyId, 15000.00, 0, Instant.parse("2024-01-01T00:00:00Z")
        );
        jdbcTemplate.update(
            "INSERT INTO client_transaction (client_id, type, amount, game_day, created_at) VALUES (?, 'WITHDRAWAL', ?, ?, ?)",
            starboyId, 2000.00, 7, Instant.parse("2024-01-08T00:00:00Z")
        );
        jdbcTemplate.update(
            "INSERT INTO client_transaction (client_id, type, amount, game_day, created_at) VALUES (?, 'WITHDRAWAL', ?, ?, ?)",
            starboyId, 200.00, 12, Instant.parse("2024-01-13T00:00:00Z")
        );

        // Maison Alkibiades transactions
        Long maisonId = jdbcTemplate.queryForObject(
            "SELECT id FROM client WHERE slot_id = 1 AND name = 'Maison Alkibiades'", Long.class
        );
        jdbcTemplate.update(
            "INSERT INTO client_transaction (client_id, type, amount, game_day, created_at) VALUES (?, 'DEPOSIT', ?, ?, ?)",
            maisonId, 50000.00, 1, Instant.parse("2024-01-02T00:00:00Z")
        );
        jdbcTemplate.update(
            "INSERT INTO client_transaction (client_id, type, amount, game_day, created_at) VALUES (?, 'WITHDRAWAL', ?, ?, ?)",
            maisonId, 7500.00, 5, Instant.parse("2024-01-06T00:00:00Z")
        );
        jdbcTemplate.update(
            "INSERT INTO client_transaction (client_id, type, amount, game_day, created_at) VALUES (?, 'WITHDRAWAL', ?, ?, ?)",
            maisonId, 8250.00, 9, Instant.parse("2024-01-10T00:00:00Z")
        );

        // Mason Bramadat transactions
        Long masonId = jdbcTemplate.queryForObject(
            "SELECT id FROM client WHERE slot_id = 1 AND name = 'Mason Bramadat'", Long.class
        );
        jdbcTemplate.update(
            "INSERT INTO client_transaction (client_id, type, amount, game_day, created_at) VALUES (?, 'DEPOSIT', ?, ?, ?)",
            masonId, 6200.00, 2, Instant.parse("2024-01-03T00:00:00Z")
        );
        jdbcTemplate.update(
            "INSERT INTO client_transaction (client_id, type, amount, game_day, created_at) VALUES (?, 'WITHDRAWAL', ?, ?, ?)",
            masonId, 1000.00, 6, Instant.parse("2024-01-07T00:00:00Z")
        );
        jdbcTemplate.update(
            "INSERT INTO client_transaction (client_id, type, amount, game_day, created_at) VALUES (?, 'WITHDRAWAL', ?, ?, ?)",
            masonId, 50.00, 12, Instant.parse("2024-01-13T00:00:00Z")
        );

        // Hal Gibert transactions
        Long halId = jdbcTemplate.queryForObject(
            "SELECT id FROM client WHERE slot_id = 1 AND name = 'Hal Gibert'", Long.class
        );
        jdbcTemplate.update(
            "INSERT INTO client_transaction (client_id, type, amount, game_day, created_at) VALUES (?, 'DEPOSIT', ?, ?, ?)",
            halId, 75000.00, 3, Instant.parse("2024-01-04T00:00:00Z")
        );
        jdbcTemplate.update(
            "INSERT INTO client_transaction (client_id, type, amount, game_day, created_at) VALUES (?, 'WITHDRAWAL', ?, ?, ?)",
            halId, 14800.00, 8, Instant.parse("2024-01-09T00:00:00Z")
        );

        // Rosemont Runner transactions
        Long rosemontId = jdbcTemplate.queryForObject(
            "SELECT id FROM client WHERE slot_id = 1 AND name = 'Rosemont Runner'", Long.class
        );
        jdbcTemplate.update(
            "INSERT INTO client_transaction (client_id, type, amount, game_day, created_at) VALUES (?, 'DEPOSIT', ?, ?, ?)",
            rosemontId, 3200.00, 4, Instant.parse("2024-01-05T00:00:00Z")
        );
        jdbcTemplate.update(
            "INSERT INTO client_transaction (client_id, type, amount, game_day, created_at) VALUES (?, 'WITHDRAWAL', ?, ?, ?)",
            rosemontId, 330.00, 10, Instant.parse("2024-01-11T00:00:00Z")
        );
        jdbcTemplate.update(
            "INSERT INTO client_transaction (client_id, type, amount, game_day, created_at) VALUES (?, 'WITHDRAWAL', ?, ?, ?)",
            rosemontId, 120.00, 12, Instant.parse("2024-01-13T00:00:00Z")
        );

        // Refresh and return updated bank state
        BankState updatedState = bankStateRepository.findBySlotId(1)
            .orElseThrow(() -> new IllegalStateException("Bank state for slot 1 not found after seeding"));
        return toResponse(updatedState);
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
