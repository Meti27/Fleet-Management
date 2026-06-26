package com.fleet.backend.repository;

import com.fleet.backend.entity.OdometerReading;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OdometerReadingRepository extends JpaRepository<OdometerReading, Integer> {

    List<OdometerReading> findByTruck_IdOrderByRecordedAtDesc(Integer truckId);

    /** Highest recorded kilometre reading for a truck — the truck's "current km". */
    @Query("select max(o.readingKm) from OdometerReading o where o.truck.id = :truckId")
    Integer findMaxKm(Integer truckId);
}
