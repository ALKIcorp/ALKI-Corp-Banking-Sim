package com.alkicorp.bankingsim.model;

import com.alkicorp.bankingsim.auth.model.User;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "jobs")
public class Job {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(nullable = false, length = 120)
    private String employer;

    @Column(name = "annual_salary", nullable = false, precision = 19, scale = 2)
    private BigDecimal annualSalary;

    @Column(name = "pay_cycle_days", nullable = false)
    private Integer payCycleDays;

    @Column(name = "spending_profile", columnDefinition = "jsonb")
    private String spendingProfile;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_user_id")
    private User createdBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
