package com.alkicorp.bankingsim.web;

import com.alkicorp.bankingsim.service.BankService;
import com.alkicorp.bankingsim.web.dto.BankStateResponse;
import com.alkicorp.bankingsim.web.dto.SlotSummaryResponse;
import java.util.Arrays;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/slots")
@RequiredArgsConstructor
public class SlotController {

    private final BankService bankService;

    @GetMapping
    public List<SlotSummaryResponse> listSlots() {
        return bankService.getSlotSummaries(Arrays.asList(1, 2, 3));
    }

    @PostMapping("/{slotId}/start")
    public BankStateResponse startSlot(@PathVariable int slotId) {
        return bankService.resetAndGetState(slotId);
    }

    @GetMapping("/{slotId}/bank")
    public BankStateResponse getBankState(@PathVariable int slotId) {
        return bankService.getBankState(slotId);
    }
}
