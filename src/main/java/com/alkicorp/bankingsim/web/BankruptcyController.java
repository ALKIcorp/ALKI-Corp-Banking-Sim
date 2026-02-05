package com.alkicorp.bankingsim.web;

import com.alkicorp.bankingsim.model.BankruptcyApplication;
import com.alkicorp.bankingsim.model.enums.BankruptcyStatus;
import com.alkicorp.bankingsim.service.BankruptcyService;
import com.alkicorp.bankingsim.web.dto.BankruptcyApplicationRequest;
import com.alkicorp.bankingsim.web.dto.BankruptcyApplicationResponse;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/slots/{slotId}")
@RequiredArgsConstructor
public class BankruptcyController {

    private final BankruptcyService bankruptcyService;
    private final com.alkicorp.bankingsim.repository.BankruptcyApplicationRepository repository;

    @PostMapping("/clients/{clientId}/bankruptcy/applications")
    public BankruptcyApplicationResponse file(@PathVariable int slotId, @PathVariable Long clientId,
                                              @RequestBody BankruptcyApplicationRequest request) {
        return toResponse(bankruptcyService.file(slotId, clientId, request.getNotes()));
    }

    @PatchMapping("/bankruptcy/applications/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public BankruptcyApplicationResponse decide(@PathVariable Long id, @RequestBody BankruptcyApplicationRequest request) {
        BankruptcyStatus status = BankruptcyStatus.valueOf(request.getNotes() != null && request.getNotes().equalsIgnoreCase("DENY")
            ? "DENIED" : "APPROVED");
        return toResponse(bankruptcyService.decide(id, status));
    }

    @GetMapping("/bankruptcy/applications")
    @PreAuthorize("hasRole('ADMIN')")
    public List<BankruptcyApplicationResponse> list(@PathVariable int slotId) {
        return repository.findBySlotId(slotId).stream().map(this::toResponse).collect(Collectors.toList());
    }

    @GetMapping("/clients/{clientId}/bankruptcy/applications")
    public List<BankruptcyApplicationResponse> listForClient(@PathVariable Long clientId) {
        return repository.findByClientId(clientId).stream().map(this::toResponse).collect(Collectors.toList());
    }

    private BankruptcyApplicationResponse toResponse(BankruptcyApplication app) {
        return BankruptcyApplicationResponse.builder()
            .id(app.getId())
            .slotId(app.getSlotId())
            .clientId(app.getClient().getId())
            .status(app.getStatus().name())
            .filedAt(app.getFiledAt())
            .decidedAt(app.getDecidedAt())
            .dischargeAt(app.getDischargeAt())
            .notes(app.getNotes())
            .build();
    }
}
