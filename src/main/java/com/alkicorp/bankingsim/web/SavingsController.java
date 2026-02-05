package com.alkicorp.bankingsim.web;

import com.alkicorp.bankingsim.service.SavingsService;
import com.alkicorp.bankingsim.web.dto.MoneyRequest;
import com.alkicorp.bankingsim.model.Transaction;
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
    public Transaction deposit(@PathVariable int slotId, @PathVariable Long clientId, @RequestBody MoneyRequest request) {
        return savingsService.depositToSavings(slotId, clientId, request.getAmount());
    }

    @PostMapping("/withdraw")
    public Transaction withdraw(@PathVariable int slotId, @PathVariable Long clientId, @RequestBody MoneyRequest request) {
        return savingsService.withdrawFromSavings(slotId, clientId, request.getAmount());
    }
}
