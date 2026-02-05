package com.alkicorp.bankingsim.web.dto;

import java.math.BigDecimal;
import java.time.Instant;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class LivingResponse {
    String livingType;
    Long propertyId;
    Long rentalId;
    BigDecimal monthlyRent;
    Integer nextRentDay;
    Boolean delinquent;
    Instant startDate;
}
