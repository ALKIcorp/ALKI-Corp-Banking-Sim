package com.alkicorp.bankingsim.web.dto;

import java.math.BigDecimal;
import lombok.Value;

@Value
public class SpendingCategoryRequest {
    String name;
    BigDecimal minPctIncome;
    BigDecimal maxPctIncome;
    BigDecimal variability;
    Boolean mandatory;
    Boolean defaultActive;
}
