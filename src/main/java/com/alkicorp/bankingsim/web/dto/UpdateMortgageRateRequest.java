package com.alkicorp.bankingsim.web.dto;

import java.math.BigDecimal;
import lombok.Value;

@Value
public class UpdateMortgageRateRequest {
    BigDecimal mortgageRate;
}
