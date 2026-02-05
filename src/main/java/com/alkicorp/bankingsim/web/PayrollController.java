package com.alkicorp.bankingsim.web;

import com.alkicorp.bankingsim.service.PayrollService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/slots/{slotId}/payroll")
@RequiredArgsConstructor
public class PayrollController {

    private final PayrollService payrollService;

    @PostMapping("/run")
    @PreAuthorize("hasRole('ADMIN')")
    public void run(@PathVariable int slotId) {
        payrollService.runPayroll(slotId, 0d);
    }
}
