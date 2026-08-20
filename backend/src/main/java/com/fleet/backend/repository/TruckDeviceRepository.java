package com.fleet.backend.repository;

import com.fleet.backend.entity.TruckDevice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TruckDeviceRepository extends JpaRepository<TruckDevice, Integer> {

    /** Authenticate an incoming upload by its hashed device key. */
    Optional<TruckDevice> findByDeviceKeyHashAndActiveTrue(String deviceKeyHash);

    List<TruckDevice> findByTruck_Id(Integer truckId);
}
