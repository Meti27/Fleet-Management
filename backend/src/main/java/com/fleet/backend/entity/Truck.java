package com.fleet.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

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

    @Column(length = 20)
    private String status;

    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if(createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if(status == null) {
            status = "AVAILABLE";
        }
    }
}
