package com.alkicorp.bankingsim.model;

import com.alkicorp.bankingsim.model.enums.LivingType;
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
@Table(name = "client_living")
public class ClientLiving {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;

    @Column(name = "slot_id", nullable = false)
    private Integer slotId;

    @Enumerated(EnumType.STRING)
    @Column(name = "living_type", nullable = false, length = 40)
    private LivingType livingType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id")
    private Product property;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rental_id")
    private Rental rental;

    @Column(name = "start_date", nullable = false)
    private Instant startDate;

    @Column(name = "next_rent_day", nullable = false)
    private Integer nextRentDay;

    @Column(name = "monthly_rent_cache", precision = 19, scale = 2)
    private BigDecimal monthlyRentCache;

    @Column(name = "delinquent", nullable = false)
    private Boolean delinquent = false;
}
