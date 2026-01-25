package com.alkicorp.bankingsim.web.dto;

import java.math.BigDecimal;
import java.time.Instant;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class ProductResponse {
    Long id;
    int slotId;
    String name;
    BigDecimal price;
    String description;
    int rooms;
    int sqft2;
    String imageUrl;
    String status;
    Long ownerClientId;
    Instant createdAt;
}
