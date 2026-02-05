package com.alkicorp.bankingsim.model;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "client_jobs")
public class ClientJob {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;

    @Column(name = "slot_id", nullable = false)
    private Integer slotId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private Job job;

    @Column(name = "start_date", nullable = false)
    private Instant startDate;

    @Column(name = "next_payday", nullable = false)
    private Double nextPayday;

    @Column(name = "is_primary", nullable = false)
    private Boolean primary = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
