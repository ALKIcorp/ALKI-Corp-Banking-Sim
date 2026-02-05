package com.alkicorp.bankingsim.web;

import com.alkicorp.bankingsim.model.RepossessionEvent;
import com.alkicorp.bankingsim.service.RepossessionService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/slots/{slotId}/repossession")
@RequiredArgsConstructor
public class RepossessionController {

    private final RepossessionService repossessionService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<RepossessionEvent> list(@PathVariable int slotId) {
        return repossessionService.listBySlot(slotId);
    }

    @PostMapping("/run")
    @PreAuthorize("hasRole('ADMIN')")
    public void run(@PathVariable int slotId) {
        // repossessions are automatic in simulation; this endpoint is a manual trigger placeholder
    }
}
