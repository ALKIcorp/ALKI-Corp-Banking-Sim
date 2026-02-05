package com.alkicorp.bankingsim.service;

import com.alkicorp.bankingsim.model.Client;
import com.alkicorp.bankingsim.model.ClientJob;
import com.alkicorp.bankingsim.model.Transaction;
import com.alkicorp.bankingsim.model.enums.TransactionType;
import com.alkicorp.bankingsim.repository.ClientJobRepository;
import com.alkicorp.bankingsim.repository.ClientRepository;
import com.alkicorp.bankingsim.repository.TransactionRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class PayrollService {

    private final ClientJobRepository clientJobRepository;
    private final ClientRepository clientRepository;
    private final TransactionRepository transactionRepository;
    private final Clock clock = Clock.systemUTC();

    @Transactional
    public void runPayroll(int slotId, double gameDay) {
        List<ClientJob> jobs = clientJobRepository.findBySlotId(slotId);
        for (ClientJob cj : jobs) {
            if (cj.getNextPayday() != null && gameDay >= cj.getNextPayday()) {
                payClient(cj, gameDay);
            }
        }
    }

    private void payClient(ClientJob cj, double gameDay) {
        Client client = cj.getClient();

        // Calculate pay based on annual salary and pay cycle days.
        // periodsPerYear = 365 / payCycleDays
        // pay = annualSalary / periodsPerYear = annualSalary * payCycleDays / 365
        BigDecimal pay = cj.getJob().getAnnualSalary()
                .multiply(BigDecimal.valueOf(cj.getJob().getPayCycleDays()))
                .divide(BigDecimal.valueOf(365), 2, RoundingMode.HALF_UP);

        log.info("Processing payroll for client {}: {} (Job: {})", client.getId(), pay, cj.getJob().getTitle());

        client.setCheckingBalance(client.getCheckingBalance().add(pay));
        clientRepository.save(client);

        Transaction tx = new Transaction();
        tx.setClient(client);
        tx.setType(TransactionType.PAYROLL_DEPOSIT);
        tx.setAmount(pay);
        tx.setGameDay((int) Math.floor(gameDay));
        tx.setCreatedAt(Instant.now(clock));
        transactionRepository.save(tx);

        cj.setNextPayday(gameDay + cj.getJob().getPayCycleDays());
        clientJobRepository.save(cj);
    }
}
