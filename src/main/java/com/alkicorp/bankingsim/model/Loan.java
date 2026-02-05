package com.alkicorp.bankingsim.model;

import com.alkicorp.bankingsim.auth.model.User;
import com.alkicorp.bankingsim.model.enums.LoanStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "loans")
public class Loan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "slot_id", nullable = false)
    private Integer slotId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;

    @Column(name = "amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Column(name = "term_years", nullable = false)
    private Integer termYears;

    @Column(name = "interest_rate", nullable = false, precision = 6, scale = 4)
    private BigDecimal interestRate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private LoanStatus status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "missed_payments", nullable = false)
    private Integer missedPayments;

    @Column(name = "last_payment_status", length = 40)
    private String lastPaymentStatus;

    @Column(name = "repossession_flag", nullable = false)
    private Boolean repossessionFlag;

    @Column(name = "written_off", nullable = false)
    private Boolean writtenOff;

    @Column(name = "next_payment_day")
    private Integer nextPaymentDay;

    @Column(name = "monthly_payment", precision = 19, scale = 2)
    private BigDecimal monthlyPayment;

    @Column(name = "apr_snapshot", precision = 6, scale = 4)
    private BigDecimal aprSnapshot;

    @Column(name = "dti_at_origination", precision = 5, scale = 4)
    private BigDecimal dtiAtOrigination;
}
