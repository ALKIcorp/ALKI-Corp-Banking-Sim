package com.alkicorp.bankingsim.model;

import jakarta.persistence.Column;
import com.alkicorp.bankingsim.auth.model.User;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "bank_state")
public class BankState {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "slot_id", nullable = false)
    private Integer slotId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "liquid_cash", nullable = false, precision = 19, scale = 2)
    private BigDecimal liquidCash;

    @Column(name = "invested_sp500", nullable = false, precision = 19, scale = 2)
    private BigDecimal investedSp500;

    @Column(name = "sp500_price", nullable = false, precision = 19, scale = 2)
    private BigDecimal sp500Price;

    @Column(name = "mortgage_rate", nullable = false, precision = 6, scale = 4)
    private BigDecimal mortgageRate;

    @Column(name = "game_day", nullable = false)
    private Double gameDay;

    @Column(name = "next_dividend_day", nullable = false)
    private Integer nextDividendDay;

    @Column(name = "next_growth_day", nullable = false)
    private Integer nextGrowthDay;

    @Column(name = "last_update_timestamp", nullable = false)
    private Instant lastUpdateTimestamp;
}
