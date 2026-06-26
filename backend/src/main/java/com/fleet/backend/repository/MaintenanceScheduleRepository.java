package com.fleet.backend.repository;

import com.fleet.backend.entity.MaintenanceSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MaintenanceScheduleRepository extends JpaRepository<MaintenanceSchedule, Integer> {

    List<MaintenanceSchedule> findByTruck_Id(Integer truckId);

    /** Active schedules fleet-wide — used by the reminder scan. */
    List<MaintenanceSchedule> findByActiveTrue();

    Optional<MaintenanceSchedule> findByTruck_IdAndType(Integer truckId, String type);
}
