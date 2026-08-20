package com.fleet.backend.repository;


import com.fleet.backend.entity.Truck;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
@Repository
public interface TruckRepository  extends JpaRepository<Truck, Integer> {

    /** Resolve a truck from a scanned cab QR token. */
    Optional<Truck> findByQrToken(String qrToken);
}
