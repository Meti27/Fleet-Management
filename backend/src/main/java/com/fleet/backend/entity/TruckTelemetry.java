package com.fleet.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * One reading from a truck-mounted device. Unlike {@link LocationPing} — which is
 * the driver's phone reporting while the app is open — this comes from the vehicle
 * itself, so it is not under the driver's control. That independence is the whole
 * point: it is what a claim of "job in progress" is checked against.
 *
 * <p>Position fields are nullable so an OBD-only dongle (no GPS) still fits, and the
 * OBD fields are nullable so a plain GPS tracker still fits. Hardware is undecided;
 * this shape accommodates either.</p>
 */
@Entity
@Table(name = "truck_telemetry")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TruckTelemetry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "truck_id", nullable = false)
    @JsonIgnore
    private Truck truck;

    /** The job running when this was recorded, when there was one. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id")
    @JsonIgnore
    private Job job;

    private Double latitude;
    private Double longitude;

    @Column(name = "speed_kph")
    private Double speedKph;

    private Double heading;

    /** OBD only — the vehicle's real odometer. */
    @Column(name = "odometer_km")
    private Integer odometerKm;

    /** OBD only — tank level as a percentage. */
    @Column(name = "fuel_level_pct")
    private Double fuelLevelPct;

    /** OBD only — ignition state. */
    @Column(name = "engine_on")
    private Boolean engineOn;

    /** GPS | OBD */
    @Column(nullable = false, length = 20)
    private String source;

    @Column(name = "recorded_at", nullable = false)
    private LocalDateTime recordedAt;

    @PrePersist
    public void prePersist() {
        if (recordedAt == null) recordedAt = LocalDateTime.now();
        if (source == null) source = "GPS";
    }

    /** True when this reading carries a usable position. */
    public boolean hasPosition() {
        return latitude != null && longitude != null;
    }
}
