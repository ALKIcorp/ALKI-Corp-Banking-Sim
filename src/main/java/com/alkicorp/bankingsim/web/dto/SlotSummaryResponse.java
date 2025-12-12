package com.alkicorp.bankingsim.web.dto;

import java.math.BigDecimal;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class SlotSummaryResponse {
    int slotId;
    int clientCount;
    double gameDay;
    boolean hasData;
    BigDecimal liquidCash;
}
