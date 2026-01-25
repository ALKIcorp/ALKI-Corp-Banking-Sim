package com.alkicorp.bankingsim.web.dto;

import java.math.BigDecimal;
import java.time.Instant;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class LoanResponse {
    Long id;
    int slotId;
    Long clientId;
    BigDecimal amount;
    int termYears;
    BigDecimal interestRate;
    String status;
    Instant createdAt;
    Instant updatedAt;
}
