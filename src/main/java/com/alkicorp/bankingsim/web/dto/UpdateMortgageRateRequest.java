package com.alkicorp.bankingsim.web.dto;

import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateMortgageRateRequest {
    private BigDecimal mortgageRate;
}
