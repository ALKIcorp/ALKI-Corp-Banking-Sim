package com.alkicorp.bankingsim.web.dto;

import java.math.BigDecimal;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class InvestmentStateResponse {
    BigDecimal liquidCash;
    BigDecimal investedSp500;
    BigDecimal sp500Price;
    int nextDividendDay;
    int nextGrowthDay;
    double gameDay;
}
