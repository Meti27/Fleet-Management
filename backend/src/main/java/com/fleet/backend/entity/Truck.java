package com.fleet.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "trucks")
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Truck {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "plate_number", nullable = false, length = 20, unique = true)
    private String plateNumber;

    @Column(length = 100)
    private String model;

    @Column(name = "capacity_tons")
    private Double capacityTons;

    /** Nominal fuel consumption in litres per 100 km; used to estimate trip fuel
     *  from GPS distance. Nullable until an admin sets it per vehicle. */
    @Column(name = "fuel_consumption_l100km")
    private Double fuelConsumptionL100km;

    @Column(length = 20)
    private String status;

    /** Secret behind the QR sticker in this truck's cab. A driver must scan it to
     *  start a job, which proves they are physically at the vehicle — identity
     *  still comes from their login. Generated on first persist; rotatable from
     *  the admin UI if a sticker is damaged or leaks. */
    @Column(name = "qr_token", nullable = false, length = 64, unique = true)
    @JsonIgnore
    private String qrToken;

    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if(createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if(status == null) {
            status = "AVAILABLE";
        }
        if(qrToken == null) {
            qrToken = newQrToken();
        }
    }

    /** 32 random hex chars — same shape as the V6 backfill. */
    public static String newQrToken() {
        return UUID.randomUUID().toString().replace("-", "");
    }
}
