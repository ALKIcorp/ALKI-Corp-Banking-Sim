package com.alkicorp.bankingsim.model;

import com.alkicorp.bankingsim.model.enums.AssetType;
import com.alkicorp.bankingsim.model.enums.RepossessionReason;
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
@Table(name = "repossession_event")
public class RepossessionEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;

    @Column(name = "slot_id", nullable = false)
    private Integer slotId;

    @Enumerated(EnumType.STRING)
    @Column(name = "asset_type", nullable = false, length = 40)
    private AssetType assetType;

    @Column(name = "asset_id", nullable = false)
    private Long assetId;

    @Enumerated(EnumType.STRING)
    @Column(name = "reason", nullable = false, length = 40)
    private RepossessionReason reason;

    @Column(name = "game_day", nullable = false)
    private Integer gameDay;

    @Column(name = "balance_written_off", precision = 19, scale = 2)
    private BigDecimal balanceWrittenOff;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
