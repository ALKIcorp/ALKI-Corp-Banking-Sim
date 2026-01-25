package com.alkicorp.bankingsim.service;

import com.alkicorp.bankingsim.auth.model.User;
import com.alkicorp.bankingsim.auth.service.CurrentUserService;
import com.alkicorp.bankingsim.model.Client;
import com.alkicorp.bankingsim.model.Loan;
import com.alkicorp.bankingsim.model.enums.LoanStatus;
import com.alkicorp.bankingsim.model.enums.TransactionType;
import com.alkicorp.bankingsim.repository.ClientRepository;
import com.alkicorp.bankingsim.repository.LoanRepository;
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
public class LoanService {

    private final LoanRepository loanRepository;
    private final ClientRepository clientRepository;
    private final ClientService clientService;
    private final CurrentUserService currentUserService;
    private final Clock clock = Clock.systemUTC();

    @Transactional
    public Loan createLoan(int slotId, Long clientId, BigDecimal amount, Integer termYears) {
        validateAmount(amount);
        validateTerm(termYears);
        User user = currentUserService.getCurrentUser();
        Client client = clientRepository.findByIdAndSlotIdAndBankStateUserId(clientId, slotId, user.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Client not found"));
        Loan loan = new Loan();
        loan.setSlotId(slotId);
        loan.setUser(user);
        loan.setClient(client);
        loan.setAmount(amount);
        loan.setTermYears(termYears);
        loan.setInterestRate(BigDecimal.ZERO.setScale(4));
        loan.setStatus(LoanStatus.PENDING);
        Instant now = Instant.now(clock);
        loan.setCreatedAt(now);
        loan.setUpdatedAt(now);
        return loanRepository.save(loan);
    }

    @Transactional(readOnly = true)
    public List<Loan> listLoans(int slotId) {
        User user = currentUserService.getCurrentUser();
        return loanRepository.findBySlotIdAndUserId(slotId, user.getId());
    }

    @Transactional
    public Loan updateStatus(int slotId, Long loanId, LoanStatus status) {
        User user = currentUserService.getCurrentUser();
        Loan loan = loanRepository.findByIdAndSlotIdAndUserId(loanId, slotId, user.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Loan not found"));
        if (loan.getStatus() != LoanStatus.PENDING) {
            throw new ValidationException("Loan already processed.");
        }
        if (status == LoanStatus.APPROVED) {
            clientService.creditAccount(slotId, loan.getClient().getId(), loan.getAmount(), TransactionType.LOAN_DISBURSEMENT, false);
        }
        loan.setStatus(status);
        loan.setUpdatedAt(Instant.now(clock));
        return loanRepository.save(loan);
    }

    private void validateAmount(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ValidationException("Loan amount must be greater than zero.");
        }
    }

    private void validateTerm(Integer termYears) {
        if (termYears == null || termYears < 5 || termYears > 30) {
            throw new ValidationException("Term must be between 5 and 30 years.");
        }
    }
}
