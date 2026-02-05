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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
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
        BigDecimal pay = cj.getJob().getAnnualSalary().divide(BigDecimal.valueOf(26), 2, RoundingMode.HALF_UP);
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
