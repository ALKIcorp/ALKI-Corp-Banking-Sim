package com.alkicorp.bankingsim.web.dto;

import java.util.List;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class ActivityChartResponse {
    List<Integer> days;
    List<Double> cumulativeDeposits;
    List<Double> cumulativeWithdrawals;
}
