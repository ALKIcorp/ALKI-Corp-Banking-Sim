package com.alkicorp.bankingsim.service;

import com.alkicorp.bankingsim.model.Client;
import com.alkicorp.bankingsim.model.ClientLiving;
import com.alkicorp.bankingsim.model.Loan;
import com.alkicorp.bankingsim.model.Mortgage;
import com.alkicorp.bankingsim.model.enums.LoanStatus;
import com.alkicorp.bankingsim.model.enums.MortgageStatus;
import com.alkicorp.bankingsim.repository.ClientLivingRepository;
import com.alkicorp.bankingsim.repository.ClientRepository;
import com.alkicorp.bankingsim.repository.LoanRepository;
import com.alkicorp.bankingsim.repository.MortgageRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MandatorySpendServiceTest {

    @Mock
    private ClientRepository clientRepository;
    @Mock
    private ClientLivingRepository clientLivingRepository;
    @Mock
    private LoanRepository loanRepository;
    @Mock
    private MortgageRepository mortgageRepository;

    @InjectMocks
    private MandatorySpendService mandatorySpendService;

    @Test
    void recalcAndPersist_shouldSumLoansMortgagesAndRent() {
        // Arrange
        Client client = new Client();
        client.setId(1L);
        client.setSlotId(101);

        // 1. Loans: One Approved ($100), One Pending ($500 - should ignore)
        Loan loan1 = new Loan();
        loan1.setStatus(LoanStatus.APPROVED);
        loan1.setMonthlyPayment(BigDecimal.valueOf(100.00));

        Loan loan2 = new Loan();
        loan2.setStatus(LoanStatus.PENDING);
        loan2.setMonthlyPayment(BigDecimal.valueOf(500.00));

        when(loanRepository.findByClientId(1L)).thenReturn(List.of(loan1, loan2));

        // 2. Mortgages: One Accepted ($2000), One Rejected ($3000 - should ignore)
        Mortgage mortgage1 = new Mortgage();
        mortgage1.setStatus(MortgageStatus.ACCEPTED);
        mortgage1.setMonthlyPayment(BigDecimal.valueOf(2000.00));

        Mortgage mortgage2 = new Mortgage();
        mortgage2.setStatus(MortgageStatus.REJECTED);
        mortgage2.setMonthlyPayment(BigDecimal.valueOf(3000.00));

        when(mortgageRepository.findByClientId(1L)).thenReturn(List.of(mortgage1, mortgage2));

        // 3. Rent: $500
        ClientLiving living = new ClientLiving();
        living.setMonthlyRentCache(BigDecimal.valueOf(500.00));
        when(clientLivingRepository.findByClientIdAndSlotId(1L, 101)).thenReturn(Optional.of(living));

        // Act
        BigDecimal result = mandatorySpendService.recalcAndPersist(client);

        // Assert
        // Total = 100 (Loan) + 2000 (Mortgage) + 500 (Rent) = 2600
        BigDecimal expected = BigDecimal.valueOf(2600.00).setScale(2);
        assertEquals(expected, result);

        verify(clientRepository).save(client);
        assertEquals(expected, client.getMonthlyMandatoryCache());
    }

    @Test
    void recalcAndPersist_shouldIgnoreNullPayments() {
        // Arrange
        Client client = new Client();
        client.setId(1L);
        client.setSlotId(101);

        Loan loan = new Loan();
        loan.setStatus(LoanStatus.APPROVED);
        loan.setMonthlyPayment(null); // Should handle safely

        when(loanRepository.findByClientId(1L)).thenReturn(List.of(loan));
        when(mortgageRepository.findByClientId(1L)).thenReturn(List.of());
        when(clientLivingRepository.findByClientIdAndSlotId(1L, 101)).thenReturn(Optional.empty());

        // Act
        BigDecimal result = mandatorySpendService.recalcAndPersist(client);

        // Assert
        assertEquals(BigDecimal.ZERO.setScale(2), result);
    }
}
