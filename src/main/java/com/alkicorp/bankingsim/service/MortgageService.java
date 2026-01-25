package com.alkicorp.bankingsim.service;

import com.alkicorp.bankingsim.auth.model.User;
import com.alkicorp.bankingsim.auth.service.CurrentUserService;
import com.alkicorp.bankingsim.model.BankState;
import com.alkicorp.bankingsim.model.Client;
import com.alkicorp.bankingsim.model.Mortgage;
import com.alkicorp.bankingsim.model.Product;
import com.alkicorp.bankingsim.model.enums.MortgageStatus;
import com.alkicorp.bankingsim.model.enums.ProductStatus;
import com.alkicorp.bankingsim.repository.ClientRepository;
import com.alkicorp.bankingsim.repository.MortgageRepository;
import com.alkicorp.bankingsim.repository.ProductRepository;
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
public class MortgageService {

    private final MortgageRepository mortgageRepository;
    private final ProductRepository productRepository;
    private final ClientRepository clientRepository;
    private final CurrentUserService currentUserService;
    private final SimulationService simulationService;
    private final Clock clock = Clock.systemUTC();

    @Transactional
    public Mortgage createMortgage(int slotId, Long clientId, Long productId, BigDecimal downPayment, Integer termYears) {
        validateTerm(termYears);
        validateDownPayment(downPayment);
        User user = currentUserService.getCurrentUser();
        Client client = clientRepository.findByIdAndSlotIdAndBankStateUserId(clientId, slotId, user.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Client not found"));
        Product product = productRepository.findByIdAndSlotId(productId, slotId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found"));
        if (product.getStatus() != ProductStatus.AVAILABLE) {
            throw new ValidationException("Property is no longer available.");
        }
        BigDecimal price = product.getPrice();
        if (downPayment.compareTo(price) > 0) {
            throw new ValidationException("Down payment cannot exceed the property price.");
        }
        BigDecimal loanAmount = price.subtract(downPayment);
        BankState bankState = simulationService.getAndAdvanceState(user, slotId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                "Bank state not found for slot " + slotId + ". Use POST /api/slots/" + slotId + "/start to initialize the slot."));
        BigDecimal interestRate = bankState.getMortgageRate();
        Mortgage mortgage = new Mortgage();
        mortgage.setSlotId(slotId);
        mortgage.setUser(user);
        mortgage.setClient(client);
        mortgage.setProduct(product);
        mortgage.setPropertyPrice(price);
        mortgage.setDownPayment(downPayment);
        mortgage.setLoanAmount(loanAmount);
        mortgage.setTermYears(termYears);
        mortgage.setInterestRate(interestRate);
        mortgage.setStatus(MortgageStatus.PENDING);
        Instant now = Instant.now(clock);
        mortgage.setCreatedAt(now);
        mortgage.setUpdatedAt(now);
        return mortgageRepository.save(mortgage);
    }

    @Transactional(readOnly = true)
    public List<Mortgage> listMortgages(int slotId) {
        User user = currentUserService.getCurrentUser();
        if (user.isAdminStatus()) {
            return mortgageRepository.findBySlotId(slotId);
        }
        return mortgageRepository.findBySlotIdAndUserId(slotId, user.getId());
    }

    @Transactional
    public Mortgage updateStatus(int slotId, Long mortgageId, MortgageStatus status) {
        User user = currentUserService.getCurrentUser();
        Mortgage mortgage = user.isAdminStatus()
            ? mortgageRepository.findByIdAndSlotId(mortgageId, slotId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Mortgage not found"))
            : mortgageRepository.findByIdAndSlotIdAndUserId(mortgageId, slotId, user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Mortgage not found"));
        if (mortgage.getStatus() != MortgageStatus.PENDING) {
            throw new ValidationException("Mortgage already processed.");
        }
        if (status == MortgageStatus.ACCEPTED) {
            Product product = mortgage.getProduct();
            if (product.getStatus() != ProductStatus.AVAILABLE) {
                throw new ValidationException("Property is no longer available.");
            }
            product.setStatus(ProductStatus.OWNED);
            product.setOwnerClient(mortgage.getClient());
            productRepository.save(product);
        }
        mortgage.setStatus(status);
        mortgage.setUpdatedAt(Instant.now(clock));
        return mortgageRepository.save(mortgage);
    }

    private void validateTerm(Integer termYears) {
        if (termYears == null || termYears < 5 || termYears > 30) {
            throw new ValidationException("Term must be between 5 and 30 years.");
        }
    }

    private void validateDownPayment(BigDecimal downPayment) {
        if (downPayment == null || downPayment.compareTo(BigDecimal.ZERO) < 0) {
            throw new ValidationException("Down payment cannot be negative.");
        }
    }
}
