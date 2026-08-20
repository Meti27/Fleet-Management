package com.fleet.backend.repository;

import com.fleet.backend.entity.TruckTelemetry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface TruckTelemetryRepository extends JpaRepository<TruckTelemetry, Integer> {

    /** The ordered track a truck reported for one job — the basis for distance and verification. */
    List<TruckTelemetry> findByJob_IdOrderByRecordedAtAsc(Integer jobId);

    /** Where a truck is now. */
    Optional<TruckTelemetry> findFirstByTruck_IdOrderByRecordedAtDesc(Integer truckId);

    /** Everything a truck reported inside a window, oldest first. */
    List<TruckTelemetry> findByTruck_IdAndRecordedAtBetweenOrderByRecordedAtAsc(
            Integer truckId, LocalDateTime from, LocalDateTime to);

    /**
     * The most recent <em>positioned</em> reading for every truck — the live map's
     * initial snapshot.
     *
     * <p>The position filter matters: an OBD dongle reports odometer and fuel level
     * with no GPS fix, so without it a single OBD frame arriving after a GPS one
     * would become "latest" and drop the truck off the map entirely.</p>
     */
    @Query("""
            SELECT tt FROM TruckTelemetry tt
            WHERE tt.latitude IS NOT NULL AND tt.longitude IS NOT NULL
              AND tt.recordedAt = (
                SELECT MAX(tt2.recordedAt) FROM TruckTelemetry tt2
                WHERE tt2.truck.id = tt.truck.id
                  AND tt2.latitude IS NOT NULL AND tt2.longitude IS NOT NULL
            )
            """)
    List<TruckTelemetry> findLatestPerTruck();
}
