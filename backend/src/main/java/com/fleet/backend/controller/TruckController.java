package com.fleet.backend.controller;

import com.fleet.backend.entity.Truck;
import com.fleet.backend.repository.TruckRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/trucks")
@CrossOrigin(origins = "*")
public class TruckController {

    private final TruckRepository truckRepository;
    public TruckController(TruckRepository truckRepository) {
        this.truckRepository = truckRepository;
    }

    @GetMapping
    public List<Truck> getAllTrucks(){
        return truckRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Truck> getTruckById(@PathVariable Integer id){
        return truckRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Truck createTruck(@RequestBody Truck truck){
        truck.setId(null);
        return truckRepository.save(truck);
    }

    @PostMapping("/{id}")
    public ResponseEntity<Truck> updateTruck(@PathVariable Integer id, @RequestBody Truck updated){
        return truckRepository.findById(id)
                .map(existing -> {
                    existing.setPlateNumber(updated.getPlateNumber());
                    existing.setModel(updated.getModel());
                    existing.setCapacityTons(updated.getCapacityTons());
                    existing.setStatus(updated.getStatus());
                    return ResponseEntity.ok(truckRepository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTruck(@PathVariable Integer id){
        if(!truckRepository.existsById(id)){
            return ResponseEntity.notFound().build();
        }
        truckRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
