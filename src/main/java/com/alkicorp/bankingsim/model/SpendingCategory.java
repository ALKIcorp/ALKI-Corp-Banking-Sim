package com.alkicorp.bankingsim.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "spending_categories")
public class SpendingCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(name = "min_pct_income", nullable = false, precision = 5, scale = 4)
    private BigDecimal minPctIncome;

    @Column(name = "max_pct_income", nullable = false, precision = 5, scale = 4)
    private BigDecimal maxPctIncome;

    @Column(nullable = false, precision = 5, scale = 4)
    private BigDecimal variability;

    @Column(name = "is_mandatory", nullable = false)
    private Boolean mandatory;

    @Column(name = "default_active", nullable = false)
    private Boolean defaultActive;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
