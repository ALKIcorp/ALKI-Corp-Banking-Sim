package com.alkicorp.bankingsim.web;

import com.alkicorp.bankingsim.model.Loan;
import com.alkicorp.bankingsim.model.enums.LoanStatus;
import com.alkicorp.bankingsim.service.LoanService;
import com.alkicorp.bankingsim.web.dto.LoanRequest;
import com.alkicorp.bankingsim.web.dto.LoanResponse;
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
public class LoanController {

    private final LoanService loanService;

    @PostMapping("/clients/{clientId}/loans")
    public LoanResponse createLoan(@PathVariable int slotId,
                                   @PathVariable Long clientId,
                                   @RequestBody LoanRequest request) {
        Loan loan = loanService.createLoan(slotId, clientId, request.getAmount(), request.getTermYears());
        return toResponse(loan);
    }

    @GetMapping("/loans")
    public List<LoanResponse> listLoans(@PathVariable int slotId) {
        return loanService.listLoans(slotId).stream()
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    @PostMapping("/loans/{loanId}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public LoanResponse approveLoan(@PathVariable int slotId, @PathVariable Long loanId) {
        return toResponse(loanService.updateStatus(slotId, loanId, LoanStatus.APPROVED));
    }

    @PostMapping("/loans/{loanId}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public LoanResponse rejectLoan(@PathVariable int slotId, @PathVariable Long loanId) {
        return toResponse(loanService.updateStatus(slotId, loanId, LoanStatus.REJECTED));
    }

    private LoanResponse toResponse(Loan loan) {
        return LoanResponse.builder()
            .id(loan.getId())
            .slotId(loan.getSlotId())
            .clientId(loan.getClient().getId())
            .amount(loan.getAmount())
            .termYears(loan.getTermYears())
            .interestRate(loan.getInterestRate())
            .status(loan.getStatus().name())
            .createdAt(loan.getCreatedAt())
            .updatedAt(loan.getUpdatedAt())
            .build();
    }
}
