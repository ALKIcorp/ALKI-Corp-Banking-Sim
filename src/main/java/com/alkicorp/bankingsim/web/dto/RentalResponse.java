package com.alkicorp.bankingsim.web.dto;

import java.math.BigDecimal;
import java.time.Instant;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class RentalResponse {
    Long id;
    String name;
    BigDecimal monthlyRent;
    Integer bedrooms;
    Integer sqft;
    String location;
    String imageUrl;
    String status;
    Instant createdAt;
}
