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
    String productName;
    BigDecimal propertyPrice;
    BigDecimal downPayment;
    BigDecimal loanAmount;
    BigDecimal totalPaid;
    int termYears;
    BigDecimal interestRate;
    BigDecimal monthlyPayment;
    Integer nextPaymentDay;
    Integer startPaymentDay;
    Integer paymentsMade;
    String lastPaymentStatus;
    Integer missedPayments;
    String status;
    Instant createdAt;
    Instant updatedAt;
}
