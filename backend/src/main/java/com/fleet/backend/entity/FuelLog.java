package com.fleet.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * A single refuelling event. Litres + cost feed spend reporting; the optional
 * odometer reading enables fuel-efficiency (L/100km) calculation across fills.
 */
@Entity
@Table(name = "fuel_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FuelLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "truck_id")
    @JsonIgnore
    private Truck truck;

    /** Who refuelled (optional). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driver_id")
    @JsonIgnore
    private Driver driver;

    @Column(name = "filled_at", nullable = false)
    private LocalDateTime filledAt;

    @Column(nullable = false, precision = 8, scale = 2)
    private BigDecimal liters;

    @Column(name = "cost_eur", precision = 10, scale = 2)
    private BigDecimal costEur;

    @Column(name = "odometer_km")
    private Integer odometerKm;

    @Column(name = "full_tank")
    private Boolean fullTank;

    @Column(length = 120)
    private String station;

    @Column(length = 255)
    private String note;

    @PrePersist
    public void prePersist() {
        if (filledAt == null) filledAt = LocalDateTime.now();
        if (fullTank == null) fullTank = Boolean.TRUE;
    }
}
