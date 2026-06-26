package com.fleet.backend.repository;

import com.fleet.backend.entity.TruckDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TruckDocumentRepository extends JpaRepository<TruckDocument, Integer> {

    List<TruckDocument> findByTruck_IdOrderByExpiresOnAsc(Integer truckId);

    /** All documents fleet-wide, soonest expiry first — used by the reminder scan. */
    List<TruckDocument> findAllByOrderByExpiresOnAsc();
}
