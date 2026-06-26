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
 * A maintenance/service event performed on a truck (oil change, tyre work,
 * brakes, inspection, generic repair, ...). The {@code type} string is matched
 * against {@link MaintenanceSchedule#getType()} to compute "due" reminders.
 *
 * <p>Known types: OIL_CHANGE, TIRE_REPLACEMENT, TIRE_REPAIR, BRAKES,
 * INSPECTION, REPAIR, OTHER (see {@code MaintenanceTypes}).</p>
 */
@Entity
@Table(name = "maintenance_records")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MaintenanceRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "truck_id")
    @JsonIgnore
    private Truck truck;

    @Column(length = 40, nullable = false)
    private String type;

    @Column(name = "performed_at", nullable = false)
    private LocalDateTime performedAt;

    @Column(name = "odometer_km")
    private Integer odometerKm;

    @Column(name = "cost_eur", precision = 10, scale = 2)
    private BigDecimal costEur;

    @Column(length = 120)
    private String vendor;

    @Column(length = 500)
    private String notes;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (performedAt == null) performedAt = LocalDateTime.now();
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
