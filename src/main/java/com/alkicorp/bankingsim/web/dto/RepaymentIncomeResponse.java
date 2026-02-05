package com.alkicorp.bankingsim.web.dto;

import com.alkicorp.bankingsim.model.enums.TransactionType;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class RepaymentIncomeResponse {
    String clientName;
    TransactionType type;
    BigDecimal amount;
    int gameDay;
    Instant createdAt;
}
