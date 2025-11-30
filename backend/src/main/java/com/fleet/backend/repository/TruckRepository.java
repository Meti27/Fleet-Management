package com.fleet.backend.repository;


import com.fleet.backend.entity.Truck;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
@Repository
public interface TruckRepository  extends JpaRepository<Truck, Integer> {
    //later we add custom queries
}
