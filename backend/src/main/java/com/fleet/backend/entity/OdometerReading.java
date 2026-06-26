package com.fleet.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * A point-in-time mileage reading for a truck (kilometres). Fuel and maintenance
 * entries also create readings so the truck's "current km" can be derived from a
 * single source of truth.
 */
@Entity
@Table(name = "odometer_readings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OdometerReading {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "truck_id")
    @JsonIgnore
    private Truck truck;

    @Column(name = "reading_km", nullable = false)
    private Integer readingKm;

    @Column(name = "recorded_at", nullable = false)
    private LocalDateTime recordedAt;

    /** MANUAL | FUEL | MAINTENANCE — how the reading was captured. */
    @Column(length = 30)
    private String source;

    @Column(length = 255)
    private String note;

    @PrePersist
    public void prePersist() {
        if (recordedAt == null) recordedAt = LocalDateTime.now();
        if (source == null) source = "MANUAL";
    }
}
