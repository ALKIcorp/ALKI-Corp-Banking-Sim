package com.alkicorp.bankingsim.web;

import com.alkicorp.bankingsim.auth.model.User;
import com.alkicorp.bankingsim.auth.service.CurrentUserService;
import com.alkicorp.bankingsim.service.PayrollService;
import com.alkicorp.bankingsim.service.SimulationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/slots/{slotId}/payroll")
@RequiredArgsConstructor
public class PayrollController {

    private final PayrollService payrollService;
    private final SimulationService simulationService;
    private final CurrentUserService currentUserService;

    @PostMapping("/run")
    @PreAuthorize("hasRole('ADMIN')")
    public void run(@PathVariable int slotId) {
        User user = currentUserService.getCurrentUser();
        double currentGameDay = simulationService.getAndAdvanceState(user, slotId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                "Bank state not found for slot " + slotId + ". Use POST /api/slots/" + slotId + "/start to initialize the slot."))
            .getGameDay();

        // Use the up-to-date simulated day so any due paychecks post immediately.
        payrollService.runPayroll(slotId, user.getId(), currentGameDay);
    }
}
