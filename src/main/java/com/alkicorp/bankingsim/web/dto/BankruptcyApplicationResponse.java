package com.alkicorp.bankingsim.web.dto;

import java.time.Instant;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class BankruptcyApplicationResponse {
    Long id;
    Integer slotId;
    Long clientId;
    String status;
    Instant filedAt;
    Instant decidedAt;
    Double dischargeAt;
    String notes;
}
