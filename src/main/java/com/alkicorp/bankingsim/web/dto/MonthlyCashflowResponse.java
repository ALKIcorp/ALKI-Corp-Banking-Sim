package com.alkicorp.bankingsim.web.dto;

import java.math.BigDecimal;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class MonthlyCashflowResponse {
    Integer gameMonth;
    BigDecimal income;
    BigDecimal spending;
    BigDecimal net;
    double spendingVsIncomePct;
}
