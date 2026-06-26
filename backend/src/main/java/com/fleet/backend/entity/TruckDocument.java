package com.fleet.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * A document attached to a truck with an expiry date (registration, insurance,
 * technical inspection, ...). Drives "expiring soon / expired" reminders.
 *
 * <p>Known types: REGISTRATION, INSURANCE, INSPECTION, OTHER.</p>
 */
@Entity
@Table(name = "truck_documents")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TruckDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "truck_id")
    @JsonIgnore
    private Truck truck;

    @Column(length = 40, nullable = false)
    private String type;

    @Column(name = "document_number", length = 80)
    private String documentNumber;

    @Column(name = "issued_on")
    private LocalDate issuedOn;

    @Column(name = "expires_on", nullable = false)
    private LocalDate expiresOn;

    @Column(length = 255)
    private String note;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
