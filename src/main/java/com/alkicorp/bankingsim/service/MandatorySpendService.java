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
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MandatorySpendService {

    private final ClientRepository clientRepository;
    private final ClientLivingRepository clientLivingRepository;
    private final LoanRepository loanRepository;
    private final MortgageRepository mortgageRepository;

    /**
     * Recompute mandatory monthly spend for the client from all active obligations:
     * approved personal loans, accepted mortgages, and current rent. Nothing else is included.
     */
    @Transactional
    public BigDecimal recalcAndPersist(Client client) {
        BigDecimal total = BigDecimal.ZERO;

        // Approved personal loans
        for (Loan loan : loanRepository.findByClientId(client.getId())) {
            if (loan.getStatus() == LoanStatus.APPROVED && loan.getMonthlyPayment() != null) {
                total = total.add(loan.getMonthlyPayment());
            }
        }

        // Accepted mortgages
        for (Mortgage mortgage : mortgageRepository.findByClientId(client.getId())) {
            if (mortgage.getStatus() == MortgageStatus.ACCEPTED && mortgage.getMonthlyPayment() != null) {
                total = total.add(mortgage.getMonthlyPayment());
            }
        }

        // Current rent (if renting)
        ClientLiving living = clientLivingRepository
            .findByClientIdAndSlotId(client.getId(), client.getSlotId())
            .orElse(null);
        if (living != null && living.getMonthlyRentCache() != null) {
            total = total.add(living.getMonthlyRentCache());
        }

        total = total.setScale(2, RoundingMode.HALF_UP);
        if (!Objects.equals(client.getMonthlyMandatoryCache(), total)) {
            client.setMonthlyMandatoryCache(total);
            clientRepository.save(client);
        }
        return total;
    }
}
