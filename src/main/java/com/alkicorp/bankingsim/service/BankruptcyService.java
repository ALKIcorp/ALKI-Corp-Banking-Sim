package com.alkicorp.bankingsim.service;

import com.alkicorp.bankingsim.model.BankruptcyApplication;
import com.alkicorp.bankingsim.model.Client;
import com.alkicorp.bankingsim.model.enums.BankruptcyStatus;
import com.alkicorp.bankingsim.repository.BankruptcyApplicationRepository;
import com.alkicorp.bankingsim.repository.ClientRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BankruptcyService {

    private final BankruptcyApplicationRepository bankruptcyApplicationRepository;
    private final ClientRepository clientRepository;
    private final ClientService clientService;
    private final Clock clock = Clock.systemUTC();

    public BankruptcyService(
            BankruptcyApplicationRepository bankruptcyApplicationRepository,
            ClientRepository clientRepository,
            @Lazy ClientService clientService) {
        this.bankruptcyApplicationRepository = bankruptcyApplicationRepository;
        this.clientRepository = clientRepository;
        this.clientService = clientService;
    }

    @Transactional
    public BankruptcyApplication file(int slotId, Long clientId, String notes) {
        Client client = clientService.getClient(slotId, clientId);
        BankruptcyApplication app = new BankruptcyApplication();
        app.setSlotId(slotId);
        app.setClient(client);
        app.setStatus(BankruptcyStatus.PENDING);
        app.setFiledAt(Instant.now(clock));
        app.setNotes(notes);
        return bankruptcyApplicationRepository.save(app);
    }

    @Transactional
    public BankruptcyApplication decide(Long applicationId, BankruptcyStatus status) {
        BankruptcyApplication app = bankruptcyApplicationRepository.findById(applicationId)
                .orElseThrow(
                        () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bankruptcy application not found"));
        app.setStatus(status);
        app.setDecidedAt(Instant.now(clock));
        if (status == BankruptcyStatus.APPROVED) {
            Client client = app.getClient();
            client.setBankrupt(true);
            double dischargeDay = computeDischargeDay(app.getFiledAt());
            client.setBankruptUntil(dischargeDay);
            client.setPurchasingBlockReason("Bankruptcy");
            clientRepository.save(client);
            app.setDischargeAt(dischargeDay);
        }
        if (status == BankruptcyStatus.DENIED) {
            Client client = app.getClient();
            client.setBankrupt(false);
            client.setBankruptUntil(null);
            client.setPurchasingBlockReason(null);
            clientRepository.save(client);
        }
        return bankruptcyApplicationRepository.save(app);
    }

    @Transactional
    public void checkDischarge(int slotId) {
        List<BankruptcyApplication> apps = bankruptcyApplicationRepository.findBySlotId(slotId);
        for (BankruptcyApplication app : apps) {
            if (app.getStatus() == BankruptcyStatus.APPROVED && app.getDischargeAt() != null) {
                double nowDay = getCurrentGameDay(slotId);
                if (nowDay >= app.getDischargeAt()) {
                    app.setStatus(BankruptcyStatus.FINISHED);
                    Client client = app.getClient();
                    client.setBankrupt(false);
                    client.setBankruptUntil(null);
                    client.setPurchasingBlockReason(null);
                    clientRepository.save(client);
                    bankruptcyApplicationRepository.save(app);
                }
            }
        }
    }

    private double getCurrentGameDay(int slotId) {
        // best effort: assume current user context
        return 0d;
    }

    private double computeDischargeDay(Instant filedAt) {
        // 7 years expressed in game days: 7 * 12 * 30 = 2520
        return 2520d;
    }
}
