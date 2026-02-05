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
    public void runPayroll(int slotId, Long userId, double gameDay) {
        List<ClientJob> jobs = clientJobRepository.findBySlotIdAndClientBankStateUserId(slotId, userId);
        for (ClientJob cj : jobs) {
            if (!Boolean.TRUE.equals(cj.getPrimary())) {
                continue;
            }
            // Use a while loop to handle skipped days or fast-forwarding, or granular ticks
            while (cj.getNextPayday() != null && gameDay >= cj.getNextPayday()) {
                payClient(cj, cj.getNextPayday());
            }
        }
    }

    private void payClient(ClientJob cj, double payday) {
        Client client = cj.getClient();

        // One game day equals one month. Every month, the client gets 1/12 of their
        // annual salary.
        BigDecimal pay = cj.getJob().getAnnualSalary()
                .divide(BigDecimal.valueOf(SimulationConstants.DAYS_PER_YEAR), 2, RoundingMode.HALF_UP);

        log.info("Processing simplified monthly payroll for client {} (Job: {}, Day: {}): {}",
                client.getId(), cj.getJob().getTitle(), payday, pay);

        client.setCheckingBalance(client.getCheckingBalance().add(pay));
        clientRepository.save(client);

        Transaction tx = new Transaction();
        tx.setClient(client);
        tx.setType(TransactionType.PAYROLL_DEPOSIT);
        tx.setAmount(pay);
        tx.setGameDay((int) Math.floor(payday));
        tx.setCreatedAt(Instant.now(clock));
        transactionRepository.save(tx);

        // Advance by exactly 1.0 game day (one in-game month)
        cj.setNextPayday(payday + 1.0);
        clientJobRepository.save(cj);
    }
}
