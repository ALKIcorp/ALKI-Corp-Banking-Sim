package com.alkicorp.bankingsim.web;

import com.alkicorp.bankingsim.model.Mortgage;
import com.alkicorp.bankingsim.model.enums.MortgageStatus;
import com.alkicorp.bankingsim.service.MortgageService;
import com.alkicorp.bankingsim.web.dto.MortgageRequest;
import com.alkicorp.bankingsim.web.dto.MortgageResponse;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/slots/{slotId}")
@RequiredArgsConstructor
public class MortgageController {

    private final MortgageService mortgageService;

    @PostMapping("/clients/{clientId}/mortgages")
    public MortgageResponse createMortgage(@PathVariable int slotId,
            @PathVariable Long clientId,
            @RequestBody MortgageRequest request) {
        Mortgage mortgage = mortgageService.createMortgage(
                slotId,
                clientId,
                request.getProductId(),
                request.getDownPayment(),
                request.getTermYears());
        return toResponse(mortgage);
    }

    @GetMapping("/mortgages")
    public List<MortgageResponse> listMortgages(@PathVariable int slotId) {
        return mortgageService.listMortgages(slotId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @PostMapping("/mortgages/{mortgageId}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public MortgageResponse approveMortgage(@PathVariable int slotId, @PathVariable Long mortgageId) {
        return toResponse(mortgageService.updateStatus(slotId, mortgageId, MortgageStatus.ACCEPTED));
    }

    @PostMapping("/mortgages/{mortgageId}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public MortgageResponse rejectMortgage(@PathVariable int slotId, @PathVariable Long mortgageId) {
        return toResponse(mortgageService.updateStatus(slotId, mortgageId, MortgageStatus.REJECTED));
    }

    private MortgageResponse toResponse(Mortgage mortgage) {
        return MortgageResponse.builder()
                .id(mortgage.getId())
                .slotId(mortgage.getSlotId())
                .clientId(mortgage.getClient() != null ? mortgage.getClient().getId() : null)
                .productId(mortgage.getProduct() != null ? mortgage.getProduct().getId() : null)
                .productName(mortgage.getProduct() != null ? mortgage.getProduct().getName() : "Unknown Property")
                .propertyPrice(mortgage.getPropertyPrice())
                .downPayment(mortgage.getDownPayment())
                .loanAmount(mortgage.getLoanAmount())
                .totalPaid(mortgage.getTotalPaid())
                .termYears(mortgage.getTermYears())
                .interestRate(mortgage.getInterestRate())
                .monthlyPayment(mortgage.getMonthlyPayment())
                .nextPaymentDay(mortgage.getNextPaymentDay())
                .startPaymentDay(mortgage.getStartPaymentDay())
                .paymentsMade(mortgage.getPaymentsMade())
                .lastPaymentStatus(mortgage.getLastPaymentStatus())
                .missedPayments(mortgage.getMissedPayments())
                .status(mortgage.getStatus() != null ? mortgage.getStatus().name() : null)
                .createdAt(mortgage.getCreatedAt())
                .updatedAt(mortgage.getUpdatedAt())
                .build();
    }
}
