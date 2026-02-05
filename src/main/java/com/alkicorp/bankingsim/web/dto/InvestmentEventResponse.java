package com.alkicorp.bankingsim.web.dto;

import java.math.BigDecimal;
import java.time.Instant;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class InvestmentEventResponse {
    String type;
    String asset;
    BigDecimal amount;
    int gameDay;
    Instant createdAt;
}
