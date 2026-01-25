package com.alkicorp.bankingsim.web.dto;

import java.math.BigDecimal;
import lombok.Value;

@Value
public class UpdateProductRequest {
    String name;
    BigDecimal price;
    String description;
    Integer rooms;
    Integer sqft2;
    String imageUrl;
    String status;
}
