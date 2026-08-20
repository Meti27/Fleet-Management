package com.fleet.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * A telemetry box fitted to a truck — GPS tracker or OBD dongle. Authenticates its
 * uploads with a device key presented in the {@code X-Device-Key} header.
 *
 * <p>Only the SHA-256 hash of that key is stored, and it is {@code @JsonIgnore}d so
 * it can never travel back out through an API response.</p>
 */
@Entity
@Table(name = "truck_devices")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TruckDevice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "truck_id", nullable = false)
    @JsonIgnore
    private Truck truck;

    @Column(name = "device_key_hash", nullable = false, length = 100, unique = true)
    @JsonIgnore
    private String deviceKeyHash;

    @Column(length = 80)
    private String label;

    @Column(nullable = false)
    private Boolean active;

    @Column(name = "last_seen_at")
    private LocalDateTime lastSeenAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (active == null) active = Boolean.TRUE;
    }
}
