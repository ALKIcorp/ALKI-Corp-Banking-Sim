package com.alkicorp.bankingsim.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.alkicorp.bankingsim.model.Client;
import com.alkicorp.bankingsim.model.ClientJob;
import com.alkicorp.bankingsim.model.Job;
import com.alkicorp.bankingsim.model.Transaction;
import com.alkicorp.bankingsim.repository.ClientJobRepository;
import com.alkicorp.bankingsim.repository.ClientRepository;
import com.alkicorp.bankingsim.repository.TransactionRepository;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PayrollServiceTest {

    @Mock
    private ClientJobRepository clientJobRepository;
    @Mock
    private ClientRepository clientRepository;
    @Mock
    private TransactionRepository transactionRepository;

    @InjectMocks
    private PayrollService payrollService;

    private Client client;
    private Job job;
    private ClientJob clientJob;

    @BeforeEach
    void setUp() {
        client = new Client();
        client.setId(1L);
        client.setCheckingBalance(new BigDecimal("1000.00"));

        job = new Job();
        job.setTitle("Test Job");
        job.setAnnualSalary(new BigDecimal("36500.00")); // $100 per day in real terms, but 36500 / 12 = 3041.67 per day
                                                         // in game terms
        job.setPayCycleDays(7);

        clientJob = new ClientJob();
        clientJob.setClient(client);
        clientJob.setJob(job);
        clientJob.setNextPayday(10.0);
    }

    @Test
    void runPayroll_WhenPaydayIsReached_PaysClient() {
        when(clientJobRepository.findBySlotId(1)).thenReturn(List.of(clientJob));

        payrollService.runPayroll(1, 10.0);

        // Expected pay: 36500 / 12 = 3041.666... -> 3041.67
        // New balance: 1000 + 3041.67 = 4041.67
        assertEquals(new BigDecimal("4041.67"), client.getCheckingBalance());
        assertEquals(11.0, clientJob.getNextPayday());

        verify(clientRepository).save(any(Client.class));
        verify(transactionRepository).save(any(Transaction.class));
        verify(clientJobRepository).save(any(ClientJob.class));
    }

    @Test
    void runPayroll_WhenPaydayIsNotReached_DoesNotPay() {
        when(clientJobRepository.findBySlotId(1)).thenReturn(List.of(clientJob));

        payrollService.runPayroll(1, 9.0);

        assertEquals(new BigDecimal("1000.00"), client.getCheckingBalance());
        assertEquals(10.0, clientJob.getNextPayday());

        verify(clientRepository, never()).save(any(Client.class));
        verify(transactionRepository, never()).save(any(Transaction.class));
        verify(clientJobRepository, never()).save(any(ClientJob.class));
    }
}
