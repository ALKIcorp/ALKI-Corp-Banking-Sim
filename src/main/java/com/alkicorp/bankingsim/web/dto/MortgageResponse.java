package com.alkicorp.bankingsim.web.dto;

import java.math.BigDecimal;
import java.time.Instant;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class MortgageResponse {
    Long id;
    int slotId;
    Long clientId;
    Long productId;
    BigDecimal propertyPrice;
    BigDecimal downPayment;
    BigDecimal loanAmount;
    int termYears;
    BigDecimal interestRate;
    String status;
    Instant createdAt;
    Instant updatedAt;
}
