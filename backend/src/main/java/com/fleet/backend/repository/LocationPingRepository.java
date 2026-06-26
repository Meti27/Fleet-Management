package com.fleet.backend.repository;

import com.fleet.backend.entity.LocationPing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface LocationPingRepository extends JpaRepository<LocationPing, Integer> {

    /**
     * The most recent ping for every driver that has ever reported a location —
     * i.e. each driver's current position, for the admin live map's initial load.
     * A ping is "latest" when no other ping for the same driver has a greater
     * {@code recordedAt}.
     */
    @Query("""
            SELECT lp FROM LocationPing lp
            WHERE lp.recordedAt = (
                SELECT MAX(lp2.recordedAt) FROM LocationPing lp2
                WHERE lp2.driver.id = lp.driver.id
            )
            """)
    List<LocationPing> findLatestPerDriver();

    /** All pings recorded for a job, oldest first — the ordered track of one trip. */
    List<LocationPing> findByJob_IdOrderByRecordedAtAsc(Integer jobId);
}
