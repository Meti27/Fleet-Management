package com.fleet.backend.repository;

import com.fleet.backend.entity.Driver;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DriverRepository extends JpaRepository<Driver, Integer> {

    // Resolve the Driver behind a logged-in driver-app user.
    Optional<Driver> findByUser_Id(Integer userId);
}
