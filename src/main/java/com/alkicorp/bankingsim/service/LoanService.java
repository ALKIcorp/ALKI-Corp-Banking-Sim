package com.alkicorp.bankingsim.service;

import com.alkicorp.bankingsim.auth.model.User;
import com.alkicorp.bankingsim.auth.service.CurrentUserService;
import com.alkicorp.bankingsim.model.BankState;
import com.alkicorp.bankingsim.model.Client;
import com.alkicorp.bankingsim.model.Loan;
import com.alkicorp.bankingsim.model.enums.LoanStatus;
import com.alkicorp.bankingsim.model.enums.TransactionType;
import com.alkicorp.bankingsim.service.SimulationService;
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
    private final ClientService clientService;
    private final CurrentUserService currentUserService;
    private final SimulationService simulationService;
    private final Clock clock = Clock.systemUTC();

    @Transactional
    public Loan createLoan(int slotId, Long clientId, BigDecimal amount, Integer termYears) {
        validateAmount(amount);
        validateTerm(termYears);
        User user = currentUserService.getCurrentUser();
        Client client = clientService.getClient(slotId, clientId);
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
        loan.setMissedPayments(0);
        loan.setLastPaymentStatus(null);
        loan.setRepossessionFlag(false);
        loan.setWrittenOff(false);
        loan.setNextPaymentDay(null);
        loan.setMonthlyPayment(null);
        loan.setAprSnapshot(null);
        loan.setDtiAtOrigination(null);
        return loanRepository.save(loan);
    }

    @Transactional(readOnly = true)
    public List<Loan> listLoans(int slotId) {
        User user = currentUserService.getCurrentUser();
        if (user.isAdminStatus()) {
            return loanRepository.findBySlotId(slotId);
        }
        return loanRepository.findBySlotIdAndUserId(slotId, user.getId());
    }

    @Transactional
    public Loan updateStatus(int slotId, Long loanId, LoanStatus status) {
        User user = currentUserService.getCurrentUser();
        Loan loan = user.isAdminStatus()
                ? loanRepository.findByIdAndSlotId(loanId, slotId)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Loan not found"))
                : loanRepository.findByIdAndSlotIdAndUserId(loanId, slotId, user.getId())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Loan not found"));
        if (loan.getStatus() != LoanStatus.PENDING) {
            throw new ValidationException("Loan already processed.");
        }
        if (status == LoanStatus.APPROVED) {
            clientService.creditAccount(slotId, loan.getClient().getId(), loan.getAmount(),
                    TransactionType.LOAN_DISBURSEMENT, false);
            // set payment schedule defaults: monthly over term years, simple amortization
            int months = loan.getTermYears() * 12;
            BigDecimal monthlyPayment = months > 0
                    ? loan.getAmount().divide(BigDecimal.valueOf(months), 2, java.math.RoundingMode.HALF_UP)
                    : loan.getAmount();
            loan.setMonthlyPayment(monthlyPayment);
            loan.setNextPaymentDay((int) Math.floor(simulationService.getAndAdvanceState(user, slotId)
                    .map(BankState::getGameDay).orElse(0d)) + 30);
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
        if (termYears == null || termYears < 3 || termYears > 15) {
            throw new ValidationException("Term must be between 3 and 15 years.");
        }
    }
}
