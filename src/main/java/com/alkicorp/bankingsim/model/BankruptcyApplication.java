package com.alkicorp.bankingsim.model;

import com.alkicorp.bankingsim.model.enums.BankruptcyStatus;
import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "bankruptcy_applications")
public class BankruptcyApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "slot_id", nullable = false)
    private Integer slotId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private BankruptcyStatus status;

    @Column(name = "filed_at", nullable = false)
    private Instant filedAt;

    @Column(name = "decided_at")
    private Instant decidedAt;

    @Column(name = "discharge_at")
    private Double dischargeAt;

    @Column(columnDefinition = "TEXT")
    private String notes;
}
