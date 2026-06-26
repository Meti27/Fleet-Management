package com.fleet.backend.repository;

import com.fleet.backend.entity.MaintenanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MaintenanceRecordRepository extends JpaRepository<MaintenanceRecord, Integer> {

    List<MaintenanceRecord> findByTruck_IdOrderByPerformedAtDesc(Integer truckId);

    /** Latest service of a given type for a truck — the baseline for reminders. */
    Optional<MaintenanceRecord> findFirstByTruck_IdAndTypeOrderByPerformedAtDesc(Integer truckId, String type);
}
