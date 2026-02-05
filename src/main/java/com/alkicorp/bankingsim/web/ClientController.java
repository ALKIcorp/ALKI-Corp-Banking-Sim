package com.alkicorp.bankingsim.web;

import com.alkicorp.bankingsim.model.Client;
import com.alkicorp.bankingsim.model.Transaction;
import com.alkicorp.bankingsim.service.ClientService;
import com.alkicorp.bankingsim.service.ProductService;
import com.alkicorp.bankingsim.web.dto.ClientResponse;
import com.alkicorp.bankingsim.web.dto.CreateClientRequest;
import com.alkicorp.bankingsim.web.dto.MoneyRequest;
import com.alkicorp.bankingsim.web.dto.ProductResponse;
import com.alkicorp.bankingsim.web.dto.TransactionResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/slots/{slotId}/clients")
@RequiredArgsConstructor
public class ClientController {

    private final ClientService clientService;
    private final ProductService productService;

    @GetMapping
    public List<ClientResponse> listClients(@PathVariable int slotId) {
        return clientService.getClients(slotId).stream()
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    @PostMapping
    public ClientResponse createClient(@PathVariable int slotId, @Valid @RequestBody CreateClientRequest request) {
        Client client = clientService.createClient(slotId, request.getName());
        return toResponse(client);
    }

    @GetMapping("/{clientId}")
    public ClientResponse getClient(@PathVariable int slotId, @PathVariable Long clientId) {
        return toResponse(clientService.getClient(slotId, clientId));
    }

    @GetMapping("/{clientId}/transactions")
    public List<TransactionResponse> getTransactions(@PathVariable int slotId, @PathVariable Long clientId) {
        List<Transaction> txs = clientService.getTransactions(clientId, slotId);
        return txs.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @GetMapping("/{clientId}/properties")
    public List<ProductResponse> getOwnedProperties(@PathVariable int slotId, @PathVariable Long clientId) {
        return productService.getOwnedProducts(slotId, clientId).stream()
            .map(product -> ProductResponse.builder()
                .id(product.getId())
                .slotId(product.getSlotId())
                .name(product.getName())
                .price(product.getPrice())
                .description(product.getDescription())
                .rooms(product.getRooms())
                .sqft2(product.getSqft2())
                .imageUrl(product.getImageUrl())
                .status(product.getStatus().name())
                .ownerClientId(product.getOwnerClient() == null ? null : product.getOwnerClient().getId())
                .createdAt(product.getCreatedAt())
                .build())
            .collect(Collectors.toList());
    }

    @PostMapping("/{clientId}/deposit")
    public TransactionResponse deposit(@PathVariable int slotId, @PathVariable Long clientId, @Valid @RequestBody MoneyRequest request) {
        Transaction tx = clientService.deposit(slotId, clientId, request.getAmount());
        return toResponse(tx);
    }

    @PostMapping("/{clientId}/withdraw")
    public TransactionResponse withdraw(@PathVariable int slotId, @PathVariable Long clientId, @Valid @RequestBody MoneyRequest request) {
        Transaction tx = clientService.withdraw(slotId, clientId, request.getAmount());
        return toResponse(tx);
    }

    @PostMapping("/{clientId}/mortgage-funding")
    public TransactionResponse fundMortgageDownPayment(@PathVariable int slotId,
                                                       @PathVariable Long clientId,
                                                       @Valid @RequestBody MoneyRequest request) {
        Transaction tx = clientService.fundMortgageDownPayment(slotId, clientId, request.getAmount());
        return toResponse(tx);
    }

    private ClientResponse toResponse(Client client) {
        return ClientResponse.builder()
            .id(client.getId())
            .name(client.getName())
            .checkingBalance(client.getCheckingBalance())
            .savingsBalance(client.getSavingsBalance())
            .dailyWithdrawn(client.getDailyWithdrawn())
            .monthlyIncome(client.getMonthlyIncomeCache())
            .monthlyMandatory(client.getMonthlyMandatoryCache())
            .monthlyDiscretionary(client.getMonthlyDiscretionaryTarget())
            .cardNumber(client.getCardNumber())
            .cardExpiry(client.getCardExpiry())
            .cardCvv(client.getCardCvv())
            .employmentStatus(client.getEmploymentStatus())
            .bankrupt(client.getBankrupt())
            .bankruptUntil(client.getBankruptUntil())
            .purchasingBlockReason(client.getPurchasingBlockReason())
            .build();
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
