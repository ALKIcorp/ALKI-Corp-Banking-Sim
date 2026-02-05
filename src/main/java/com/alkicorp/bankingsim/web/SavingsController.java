package com.alkicorp.bankingsim.web;

import com.alkicorp.bankingsim.service.SavingsService;
import com.alkicorp.bankingsim.model.Transaction;
import com.alkicorp.bankingsim.web.dto.MoneyRequest;
import com.alkicorp.bankingsim.web.dto.TransactionResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/slots/{slotId}/clients/{clientId}/savings")
@RequiredArgsConstructor
public class SavingsController {

    private final SavingsService savingsService;

    @PostMapping("/deposit")
    public TransactionResponse deposit(@PathVariable int slotId, @PathVariable Long clientId,
            @RequestBody MoneyRequest request) {
        Transaction tx = savingsService.depositToSavings(slotId, clientId, request.getAmount());
        return toResponse(tx);
    }

    @PostMapping("/withdraw")
    public TransactionResponse withdraw(@PathVariable int slotId, @PathVariable Long clientId,
            @RequestBody MoneyRequest request) {
        Transaction tx = savingsService.withdrawFromSavings(slotId, clientId, request.getAmount());
        return toResponse(tx);
    }

    private TransactionResponse toResponse(Transaction tx) {
        return TransactionResponse.builder()
                .id(tx.getId())
                .type(tx.getType())
                .amount(tx.getAmount())
                .gameDay(tx.getGameDay())
                .createdAt(tx.getCreatedAt())
                .build();
    }
}
