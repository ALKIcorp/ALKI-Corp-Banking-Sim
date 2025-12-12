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
    BigDecimal dailyWithdrawn;
    String cardNumber;
    String cardExpiry;
    String cardCvv;
}
