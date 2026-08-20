package com.fleet.backend.controller;

import com.fleet.backend.entity.Truck;
import com.fleet.backend.repository.TruckRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/trucks")
public class TruckController {

    private final TruckRepository truckRepository;
    public TruckController(TruckRepository truckRepository) {
        this.truckRepository = truckRepository;
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping
    public List<Truck> getAllTrucks(){
        return truckRepository.findAll();
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{id}")
    public ResponseEntity<Truck> getTruckById(@PathVariable Integer id){
        return truckRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PreAuthorize("hasAnyRole('ADMIN','DISPATCHER')")
    @PostMapping
    public Truck createTruck(@RequestBody Truck truck){
        truck.setId(null);
        return truckRepository.save(truck);
    }

    @PreAuthorize("hasAnyRole('ADMIN','DISPATCHER')")
    @PutMapping("/{id}")
    public ResponseEntity<Truck> updateTruck(@PathVariable Integer id, @RequestBody Truck updated){
        return truckRepository.findById(id)
                .map(existing -> {
                    existing.setPlateNumber(updated.getPlateNumber());
                    existing.setModel(updated.getModel());
                    existing.setCapacityTons(updated.getCapacityTons());
                    existing.setFuelConsumptionL100km(updated.getFuelConsumptionL100km());
                    // status isn't part of the truck edit form, so a plate/model edit
                    // arrives with it null — only overwrite when the client sends one,
                    // otherwise every edit would silently clear the truck's status.
                    if (updated.getStatus() != null) {
                        existing.setStatus(updated.getStatus());
                    }
                    return ResponseEntity.ok(truckRepository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * The cab-sticker token for this truck, for printing the QR.
     * ADMIN/DISPATCHER only — the token is deliberately {@code @JsonIgnore}d on the
     * entity, because a driver able to read it could fake presence without ever
     * being at the vehicle.
     */
    @PreAuthorize("hasAnyRole('ADMIN','DISPATCHER')")
    @GetMapping("/{id}/qr")
    public ResponseEntity<Map<String, String>> getQr(@PathVariable Integer id) {
        return truckRepository.findById(id)
                .map(t -> ResponseEntity.ok(Map.of(
                        "plateNumber", t.getPlateNumber(),
                        "qrToken", t.getQrToken())))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /** Issue a fresh token, invalidating the old sticker (damaged, lost or leaked). */
    @PreAuthorize("hasAnyRole('ADMIN','DISPATCHER')")
    @PostMapping("/{id}/qr/regenerate")
    public ResponseEntity<Map<String, String>> regenerateQr(@PathVariable Integer id) {
        return truckRepository.findById(id)
                .map(t -> {
                    t.setQrToken(Truck.newQrToken());
                    Truck saved = truckRepository.save(t);
                    return ResponseEntity.ok(Map.of(
                            "plateNumber", saved.getPlateNumber(),
                            "qrToken", saved.getQrToken()));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PreAuthorize("hasAnyRole('ADMIN','DISPATCHER')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTruck(@PathVariable Integer id){
        if(!truckRepository.existsById(id)){
            return ResponseEntity.notFound().build();
        }
        truckRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
