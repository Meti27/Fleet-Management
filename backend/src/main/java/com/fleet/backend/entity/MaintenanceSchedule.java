package com.fleet.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * A preventive-maintenance rule for one truck and one maintenance type, e.g.
 * "oil change every 15000 km or 12 months". The reminder engine combines this
 * with the truck's current odometer and the last matching {@link MaintenanceRecord}
 * to decide whether service is due-soon or overdue.
 *
 * <p>At least one of {@code intervalKm} / {@code intervalMonths} should be set.
 * The {@code lastService*} fields are an optional baseline for trucks that were
 * serviced before they were tracked here.</p>
 */
@Entity
@Table(name = "maintenance_schedules",
        uniqueConstraints = @UniqueConstraint(name = "uq_schedule_truck_type",
                columnNames = {"truck_id", "type"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MaintenanceSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "truck_id")
    @JsonIgnore
    private Truck truck;

    @Column(length = 40, nullable = false)
    private String type;

    @Column(name = "interval_km")
    private Integer intervalKm;

    @Column(name = "interval_months")
    private Integer intervalMonths;

    @Column(name = "last_service_km")
    private Integer lastServiceKm;

    @Column(name = "last_service_at")
    private LocalDateTime lastServiceAt;

    @Column(nullable = false)
    private Boolean active;

    @Column(length = 255)
    private String note;

    @PrePersist
    public void prePersist() {
        if (active == null) active = Boolean.TRUE;
    }
}
