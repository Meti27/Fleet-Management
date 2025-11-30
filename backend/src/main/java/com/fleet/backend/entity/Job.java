package com.fleet.backend.entity;


import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;
import org.springframework.cglib.core.Local;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "jobs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Job {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(length = 150, nullable = false)
    private String title;

    @Column(name = "pickup_location", length = 200, nullable = false)
    private String pickupLocation;

    @Column(name = "dropoff_location", length = 200, nullable = false)
    private String dropoffLocation;

    private LocalDateTime pickupTime;

    private LocalDateTime dropoffTime;

    @Column(name = "price_eur", precision = 10, scale = 2)
    private BigDecimal priceEur;

    @Column(length = 20)
    private String status;

    //Relations
    @ManyToOne
    @JoinColumn(name = "driver_id")
    private Driver driver;

    @ManyToOne
    @JoinColumn(name = "truck_id")
    private Truck truck;

    @OneToMany(mappedBy = "job", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<JobStatusHistory> statusHistory;


    private LocalDateTime createAt;

    @PrePersist
    public void prePersist() {
        if(createAt == null) {
            createAt = LocalDateTime.now();
        } if(status == null) {
            status = "OPEN";
        }
    }

}
