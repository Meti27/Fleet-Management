package com.fleet.backend.repository;

import com.fleet.backend.entity.Driver;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
@Repository
public interface DriverRepository extends JpaRepository<Driver, Integer> {
    //TODO add custom queries later
}
