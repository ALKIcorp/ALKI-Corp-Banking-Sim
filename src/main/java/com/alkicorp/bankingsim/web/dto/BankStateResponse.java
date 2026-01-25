package com.alkicorp.bankingsim.web.dto;

import java.math.BigDecimal;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class BankStateResponse {
    int slotId;
    double gameDay;
    BigDecimal liquidCash;
    BigDecimal investedSp500;
    BigDecimal totalAssets;
    BigDecimal sp500Price;
    BigDecimal mortgageRate;
    int nextDividendDay;
    int nextGrowthDay;
}
