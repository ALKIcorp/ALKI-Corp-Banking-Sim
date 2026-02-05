package com.alkicorp.bankingsim.web.dto;

import java.math.BigDecimal;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class ClientResponse {
    Long id;
    String name;
    BigDecimal checkingBalance;
    BigDecimal savingsBalance;
    BigDecimal dailyWithdrawn;
    BigDecimal monthlyIncome;
    BigDecimal monthlyMandatory;
    BigDecimal monthlyDiscretionary;
    String cardNumber;
    String cardExpiry;
    String cardCvv;
    String employmentStatus;
    Boolean bankrupt;
    Double bankruptUntil;
    String purchasingBlockReason;
}
