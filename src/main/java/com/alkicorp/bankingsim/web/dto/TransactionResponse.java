package com.alkicorp.bankingsim.web.dto;

import com.alkicorp.bankingsim.model.enums.TransactionType;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class TransactionResponse {
    Long id;
    TransactionType type;
    BigDecimal amount;
    Integer gameDay;
    Instant createdAt;
}
