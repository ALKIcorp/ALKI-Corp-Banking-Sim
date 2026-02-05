package com.alkicorp.bankingsim.service;

import com.alkicorp.bankingsim.auth.model.User;
import com.alkicorp.bankingsim.auth.service.CurrentUserService;
import com.alkicorp.bankingsim.model.BankState;
import com.alkicorp.bankingsim.model.Client;
import com.alkicorp.bankingsim.model.ClientJob;
import com.alkicorp.bankingsim.model.Job;
import com.alkicorp.bankingsim.repository.ClientJobRepository;
import com.alkicorp.bankingsim.repository.ClientRepository;
import com.alkicorp.bankingsim.repository.JobRepository;
import jakarta.validation.ValidationException;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class JobService {

    private final JobRepository jobRepository;
    private final ClientJobRepository clientJobRepository;
    private final ClientRepository clientRepository;
    private final ClientService clientService;
    private final SimulationService simulationService;
    private final CurrentUserService currentUserService;
    private final Clock clock = Clock.systemUTC();

    @Transactional(readOnly = true)
    public List<Job> listJobs() {
        return jobRepository.findAllByOrderByTitleAsc();
    }

    @Transactional
    public Job createJob(Job draft) {
        validateJob(draft);
        draft.setCreatedAt(Instant.now(clock));
        draft.setId(null);
        draft.setCreatedBy(currentUserService.getCurrentUser());
        return jobRepository.save(draft);
    }

    @Transactional
    public ClientJob assignJob(int slotId, Long clientId, Long jobId, boolean primary) {
        User user = currentUserService.getCurrentUser();
        Client client = clientService.getClient(slotId, clientId);
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found"));
        ClientJob cj = new ClientJob();
        cj.setClient(client);
        cj.setSlotId(slotId);
        cj.setJob(job);
        cj.setStartDate(Instant.now(clock));
        BankState state = simulationService.getAndAdvanceState(user, slotId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Bank state not found for slot " + slotId + ". Use POST /api/slots/" + slotId
                                + "/start to initialize the slot."));
        // Initialize nextPayday to the start of the NEXT whole game day (month counter
        // increment).
        cj.setNextPayday(Math.floor(state.getGameDay()) + 1.0);
        cj.setPrimary(primary);
        cj.setCreatedAt(Instant.now(clock));
        if (primary) {
            clientJobRepository.findByClientId(client.getId()).forEach(existing -> {
                if (Boolean.TRUE.equals(existing.getPrimary())) {
                    existing.setPrimary(false);
                    clientJobRepository.save(existing);
                }
            });
        }
        ClientJob saved = clientJobRepository.save(cj);
        recalculateMonthlyIncome(client);
        return saved;
    }

    private void recalculateMonthlyIncome(Client client) {
        List<ClientJob> jobs = clientJobRepository.findByClientId(client.getId());
        BigDecimal totalMonthlyIncome = jobs.stream()
                .filter(cj -> Boolean.TRUE.equals(cj.getPrimary()))
                .map(cj -> cj.getJob().getAnnualSalary())
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(SimulationConstants.DAYS_PER_YEAR), 2, java.math.RoundingMode.HALF_UP);

        client.setMonthlyIncomeCache(totalMonthlyIncome);
        clientRepository.save(client);
    }

    private void validateJob(Job job) {
        if (job == null) {
            throw new ValidationException("Job data required");
        }
        if (job.getTitle() == null || job.getTitle().isBlank()) {
            throw new ValidationException("Job title required");
        }
        if (job.getEmployer() == null || job.getEmployer().isBlank()) {
            throw new ValidationException("Employer required");
        }
        if (job.getAnnualSalary() == null || job.getAnnualSalary().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ValidationException("Annual salary must be positive");
        }
        if (job.getPayCycleDays() == null || job.getPayCycleDays() <= 0) {
            throw new ValidationException("Pay cycle days must be positive");
        }
    }
}
