package com.alkicorp.bankingsim.web.dto;

import java.util.List;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class ClientDistributionResponse {
    List<Item> clients;

    @Value
    @Builder
    public static class Item {
        String name;
        double balance;
    }
}
