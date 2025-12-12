package com.alkicorp.bankingsim.web;

import com.alkicorp.bankingsim.model.BankState;
import com.alkicorp.bankingsim.service.ChartService;
import com.alkicorp.bankingsim.service.InvestmentService;
import com.alkicorp.bankingsim.web.dto.ActivityChartResponse;
import com.alkicorp.bankingsim.web.dto.ClientDistributionResponse;
import com.alkicorp.bankingsim.web.dto.InvestmentStateResponse;
import com.alkicorp.bankingsim.web.dto.MoneyRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/slots/{slotId}")
@RequiredArgsConstructor
public class BankExtrasController {

    private final InvestmentService investmentService;
    private final ChartService chartService;

    @GetMapping("/investments/sp500")
    public InvestmentStateResponse getInvestmentState(@PathVariable int slotId) {
        BankState state = investmentService.getInvestmentState(slotId);
        return InvestmentStateResponse.builder()
            .liquidCash(state.getLiquidCash())
            .investedSp500(state.getInvestedSp500())
            .sp500Price(state.getSp500Price())
            .nextDividendDay(state.getNextDividendDay())
            .nextGrowthDay(state.getNextGrowthDay())
            .gameDay(state.getGameDay())
            .build();
    }

    @PostMapping("/investments/sp500/invest")
    public InvestmentStateResponse invest(@PathVariable int slotId, @Valid @RequestBody MoneyRequest request) {
        BankState state = investmentService.investInSp500(slotId, request.getAmount());
        return InvestmentStateResponse.builder()
            .liquidCash(state.getLiquidCash())
            .investedSp500(state.getInvestedSp500())
            .sp500Price(state.getSp500Price())
            .nextDividendDay(state.getNextDividendDay())
            .nextGrowthDay(state.getNextGrowthDay())
            .gameDay(state.getGameDay())
            .build();
    }

    @PostMapping("/investments/sp500/divest")
    public InvestmentStateResponse divest(@PathVariable int slotId, @Valid @RequestBody MoneyRequest request) {
        BankState state = investmentService.divestFromSp500(slotId, request.getAmount());
        return InvestmentStateResponse.builder()
            .liquidCash(state.getLiquidCash())
            .investedSp500(state.getInvestedSp500())
            .sp500Price(state.getSp500Price())
            .nextDividendDay(state.getNextDividendDay())
            .nextGrowthDay(state.getNextGrowthDay())
            .gameDay(state.getGameDay())
            .build();
    }

    @GetMapping("/charts/clients")
    public ClientDistributionResponse clientDistribution(@PathVariable int slotId) {
        return chartService.getClientDistribution(slotId);
    }

    @GetMapping("/charts/activity")
    public ActivityChartResponse activityChart(@PathVariable int slotId) {
        return chartService.getActivityChart(slotId);
    }
}
