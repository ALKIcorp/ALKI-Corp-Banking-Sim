package com.alkicorp.bankingsim.model;

import jakarta.persistence.Column;
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
@Table(name = "client")
public class Client {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bank_state_id", nullable = false)
    private BankState bankState;

    @Column(name = "slot_id", nullable = false)
    private Integer slotId;

    @Column(name = "name", nullable = false, length = 80)
    private String name;

    @Column(name = "checking_balance", nullable = false, precision = 19, scale = 2)
    private BigDecimal checkingBalance;

    @Column(name = "daily_withdrawn", nullable = false, precision = 19, scale = 2)
    private BigDecimal dailyWithdrawn;

    @Column(name = "card_number", nullable = false, length = 32)
    private String cardNumber;

    @Column(name = "card_expiry", nullable = false, length = 8)
    private String cardExpiry;

    @Column(name = "card_cvv", nullable = false, length = 4)
    private String cardCvv;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "savings_balance", nullable = false, precision = 19, scale = 2)
    private BigDecimal savingsBalance;

    @Column(name = "monthly_income_cache", precision = 19, scale = 2)
    private BigDecimal monthlyIncomeCache;

    @Column(name = "monthly_mandatory_cache", precision = 19, scale = 2)
    private BigDecimal monthlyMandatoryCache;

    @Column(name = "monthly_discretionary_target", precision = 19, scale = 2)
    private BigDecimal monthlyDiscretionaryTarget;

    @Column(name = "employment_status", nullable = false, length = 40)
    private String employmentStatus;

    @Column(name = "is_bankrupt", nullable = false)
    private Boolean bankrupt;

    @Column(name = "bankrupt_until")
    private Double bankruptUntil;

    @Column(name = "missed_payment_streak", nullable = false)
    private Integer missedPaymentStreak;

    @Column(name = "purchasing_block_reason", length = 160)
    private String purchasingBlockReason;
}
