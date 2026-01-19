package com.fleet.backend.repository;

import com.fleet.backend.entity.Job;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface JobRepository extends JpaRepository<Job, Integer> {

    @Query("""
    select j from Job j
    where j.driver.id = :driverId
      and (:jobId is null or j.id <> :jobId)
      and j.pickupTime < :newDropoff
      and j.dropoffTime > :newPickup
    """)
    List<Job> findConflictingJobsForDriver(Integer driverId,
                                           Integer jobId,
                                           LocalDateTime newPickup,
                                           LocalDateTime newDropoff);

    @Query("""
    select j from Job j
    where j.truck.id = :truckId
      and (:jobId is null or j.id <> :jobId)
      and (j.status is null or j.status in :activeStatuses)
      and j.pickupTime < :newDropoff
      and j.dropoffTime > :newPickup
    """)
    List<Job> findConflictingJobsForTruck(Integer truckId,
                                          Integer jobId,
                                          List<String> activeStatuses,
                                          LocalDateTime newPickup,
                                          LocalDateTime newDropoff);
}
