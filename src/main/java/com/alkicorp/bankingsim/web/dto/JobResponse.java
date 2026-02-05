package com.alkicorp.bankingsim.web.dto;

import java.math.BigDecimal;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class JobResponse {
    Long id;
    String title;
    String employer;
    BigDecimal annualSalary;
    Integer payCycleDays;
    String spendingProfile;
}
