package com.fleet.backend.repository;

import com.fleet.backend.entity.FuelLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FuelLogRepository extends JpaRepository<FuelLog, Integer> {

    List<FuelLog> findByTruck_IdOrderByFilledAtDesc(Integer truckId);

    /** Ascending by odometer for fuel-efficiency computation across fills. */
    List<FuelLog> findByTruck_IdOrderByFilledAtAsc(Integer truckId);
}
