package com.alkicorp.bankingsim.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.alkicorp.bankingsim.auth.model.User;
import com.alkicorp.bankingsim.auth.service.CurrentUserService;
import com.alkicorp.bankingsim.model.BankState;
import com.alkicorp.bankingsim.model.Client;
import com.alkicorp.bankingsim.model.ClientJob;
import com.alkicorp.bankingsim.model.Job;
import com.alkicorp.bankingsim.repository.ClientJobRepository;
import com.alkicorp.bankingsim.repository.ClientRepository;
import com.alkicorp.bankingsim.repository.JobRepository;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class JobServiceTest {

    @Mock
    private JobRepository jobRepository;
    @Mock
    private ClientJobRepository clientJobRepository;
    @Mock
    private ClientRepository clientRepository;
    @Mock
    private ClientService clientService;
    @Mock
    private SimulationService simulationService;
    @Mock
    private CurrentUserService currentUserService;

    @InjectMocks
    private JobService jobService;

    private Client client;
    private User user;
    private BankState bankState;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(1L);

        bankState = new BankState();
        bankState.setGameDay(10.0);

        client = new Client();
        client.setId(100L);
        client.setMonthlyIncomeCache(BigDecimal.ZERO);
    }

    @Test
    void assignJob_FirstJob_UpdatesIncomeCorrectly() {
        Job job = new Job();
        job.setId(1L);
        job.setAnnualSalary(new BigDecimal("60000")); // 5000/month
        job.setPayCycleDays(14);

        when(currentUserService.getCurrentUser()).thenReturn(user);
        when(clientService.getClient(1, 100L)).thenReturn(client);
        when(jobRepository.findById(1L)).thenReturn(Optional.of(job));
        when(simulationService.getAndAdvanceState(user, 1)).thenReturn(Optional.of(bankState));

        // Mock return of saved client job
        ClientJob savedCj = new ClientJob();
        savedCj.setClient(client);
        savedCj.setJob(job);
        savedCj.setPrimary(true);
        when(clientJobRepository.save(any(ClientJob.class))).thenReturn(savedCj);

        // First call: find existing jobs (return empty)
        // Second call: recalculate income (return new job)
        when(clientJobRepository.findByClientId(100L))
                .thenReturn(new ArrayList<>())
                .thenReturn(List.of(savedCj));

        jobService.assignJob(1, 100L, 1L, true);

        // Should match exactly 5000.00
        assertEquals(new BigDecimal("5000.00"), client.getMonthlyIncomeCache());
        // One save for the new job. No saves for existing jobs (since list was empty)
        verify(clientJobRepository, times(1)).save(any(ClientJob.class));
        verify(clientRepository).save(client);
    }

    @Test
    void assignJob_SecondJob_Primary_ReplacesIncome() {
        Job job1 = new Job();
        job1.setId(1L);
        job1.setAnnualSalary(new BigDecimal("60000")); // 5000/month

        Job job2 = new Job();
        job2.setId(2L);
        job2.setAnnualSalary(new BigDecimal("30000")); // 2500/month
        job2.setPayCycleDays(14);

        // Pre-existing job assignment (primary = true)
        ClientJob existingCj = new ClientJob();
        existingCj.setClient(client);
        existingCj.setJob(job1);
        existingCj.setPrimary(true);

        // Client already has partial income
        client.setMonthlyIncomeCache(new BigDecimal("5000.00"));

        when(currentUserService.getCurrentUser()).thenReturn(user);
        when(clientService.getClient(1, 100L)).thenReturn(client);
        when(jobRepository.findById(2L)).thenReturn(Optional.of(job2));
        when(simulationService.getAndAdvanceState(user, 1)).thenReturn(Optional.of(bankState));

        ClientJob newCj = new ClientJob();
        newCj.setClient(client);
        newCj.setJob(job2);
        newCj.setPrimary(true);

        when(clientJobRepository.save(any(ClientJob.class))).thenReturn(newCj);

        // First find (for primary check): returns existingCj
        // Second find (for recalculate): returns both, but existingCj must be
        // non-primary
        when(clientJobRepository.findByClientId(100L)).thenAnswer(invocation -> {
            if (existingCj.getPrimary()) {
                return List.of(existingCj);
            } else {
                return List.of(existingCj, newCj);
            }
        });

        jobService.assignJob(1, 100L, 2L, true);

        // Should be exactly 2500.00 (replaces 5000.00)
        assertEquals(new BigDecimal("2500.00"), client.getMonthlyIncomeCache());
        verify(clientRepository).save(client);
    }
}
