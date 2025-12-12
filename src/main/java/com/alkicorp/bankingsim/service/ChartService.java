package com.alkicorp.bankingsim.service;

import com.alkicorp.bankingsim.model.BankState;
import com.alkicorp.bankingsim.model.Client;
import com.alkicorp.bankingsim.model.Transaction;
import com.alkicorp.bankingsim.model.enums.TransactionType;
import com.alkicorp.bankingsim.repository.ClientRepository;
import com.alkicorp.bankingsim.repository.TransactionRepository;
import com.alkicorp.bankingsim.web.dto.ActivityChartResponse;
import com.alkicorp.bankingsim.web.dto.ClientDistributionResponse;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ChartService {

    private final SimulationService simulationService;
    private final ClientRepository clientRepository;
    private final TransactionRepository transactionRepository;

    @Transactional(readOnly = true)
    public ClientDistributionResponse getClientDistribution(int slotId) {
        simulationService.getAndAdvanceState(slotId);
        List<Client> clients = clientRepository.findBySlotId(slotId);
        List<ClientDistributionResponse.Item> items = clients.stream()
            .sorted(Comparator.comparing(Client::getName))
            .map(c -> ClientDistributionResponse.Item.builder()
                .name(c.getName())
                .balance(c.getCheckingBalance().doubleValue())
                .build())
            .collect(Collectors.toList());
        return ClientDistributionResponse.builder().clients(items).build();
    }

    @Transactional(readOnly = true)
    public ActivityChartResponse getActivityChart(int slotId) {
        BankState state = simulationService.getAndAdvanceState(slotId);
        int currentDay = (int) Math.floor(state.getGameDay());

        List<Client> clients = clientRepository.findBySlotId(slotId);
        List<Transaction> transactions = clients.isEmpty()
            ? List.of()
            : transactionRepository.findByClientIn(clients);

        Map<Integer, BigDecimal> deposits = new HashMap<>();
        Map<Integer, BigDecimal> withdrawals = new HashMap<>();
        for (Transaction tx : transactions) {
            Map<Integer, BigDecimal> target = tx.getType() == TransactionType.DEPOSIT ? deposits : withdrawals;
            target.merge(tx.getGameDay(), tx.getAmount(), BigDecimal::add);
        }

        List<Integer> days = new ArrayList<>();
        List<Double> cumulativeDeposits = new ArrayList<>();
        List<Double> cumulativeWithdrawals = new ArrayList<>();
        BigDecimal depositTotal = BigDecimal.ZERO;
        BigDecimal withdrawalTotal = BigDecimal.ZERO;
        for (int day = 0; day <= currentDay; day++) {
            if (deposits.containsKey(day)) {
                depositTotal = depositTotal.add(deposits.get(day));
            }
            if (withdrawals.containsKey(day)) {
                withdrawalTotal = withdrawalTotal.add(withdrawals.get(day));
            }
            days.add(day);
            cumulativeDeposits.add(depositTotal.doubleValue());
            cumulativeWithdrawals.add(withdrawalTotal.doubleValue());
        }
        return ActivityChartResponse.builder()
            .days(days)
            .cumulativeDeposits(cumulativeDeposits)
            .cumulativeWithdrawals(cumulativeWithdrawals)
            .build();
    }
}
