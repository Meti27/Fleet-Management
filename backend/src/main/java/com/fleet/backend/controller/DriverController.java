package com.fleet.backend.controller;

import com.fleet.backend.entity.Driver;
import com.fleet.backend.repository.DriverRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/drivers")
@CrossOrigin(origins = "*")
public class DriverController {
    public DriverRepository driverRepository;
    public DriverController(DriverRepository driverRepository) {
        this.driverRepository = driverRepository;
    }

    @GetMapping
    public List<Driver> getAllDrivers(){
        return driverRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Driver> getDriverById(@PathVariable Integer id){
        return driverRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Driver createDriver(@RequestBody Driver driver) {
        // id, createdAt, status handled automatically
        driver.setId(null); // ensure it's treated as new
        return driverRepository.save(driver);
    }

    @PostMapping("/{id}")
    public ResponseEntity<Driver> updateDriver(
            @PathVariable Integer id,
            @RequestBody Driver updated
    ){
        return driverRepository.findById(id)
                .map(existing -> {
                    existing.setName(updated.getName());
                    existing.setPhone(updated.getPhone());
                    existing.setEmail(updated.getEmail());
                    existing.setStatus(updated.getStatus());
                    return ResponseEntity.ok(driverRepository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDriver(@PathVariable Integer id){
        if(!driverRepository.existsById(id)){
            return ResponseEntity.notFound().build();
        }
        driverRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
