package com.alkicorp.bankingsim.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateClientRequest {
    @NotBlank
    @Size(max = 80)
    private String name;
}
