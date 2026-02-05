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
    Long primaryJobId;
    String primaryJobTitle;
    String primaryJobEmployer;
    BigDecimal primaryJobAnnualSalary;
    Integer primaryJobPayCycleDays;
    java.time.Instant primaryJobStartDate;
    Boolean bankrupt;
    Double bankruptUntil;
    String purchasingBlockReason;
}
