package com.fleet.backend.controller;

import com.fleet.backend.dto.*;
import com.fleet.backend.entity.*;
import com.fleet.backend.service.FleetMaintenanceService;
import com.fleet.backend.service.MaintenanceReminderService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Truck-scoped fleet-health endpoints: fuel, maintenance, odometer, documents,
 * preventive schedules, plus a per-truck summary and reminders.
 *
 * Reads require any authenticated user; writes require ADMIN or DISPATCHER.
 */
@RestController
@RequestMapping("/api/trucks/{truckId}")
public class TruckMaintenanceController {

    private final FleetMaintenanceService service;
    private final MaintenanceReminderService reminderService;

    public TruckMaintenanceController(FleetMaintenanceService service,
                                      MaintenanceReminderService reminderService) {
        this.service = service;
        this.reminderService = reminderService;
    }

    // ----- summary & reminders -----

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/summary")
    public TruckMaintenanceSummary summary(@PathVariable Integer truckId) {
        return service.truckSummary(truckId);
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/reminders")
    public List<ReminderDto> reminders(@PathVariable Integer truckId) {
        return reminderService.remindersForTruck(truckId);
    }

    // ----- fuel -----

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/fuel-logs")
    public List<FuelLog> fuelLogs(@PathVariable Integer truckId) {
        return service.listFuelLogs(truckId);
    }

    @PreAuthorize("hasAnyRole('ADMIN','DISPATCHER')")
    @PostMapping("/fuel-logs")
    public FuelLog addFuelLog(@PathVariable Integer truckId, @RequestBody FuelLogRequest req) {
        return service.addFuelLog(truckId, req);
    }

    @PreAuthorize("hasAnyRole('ADMIN','DISPATCHER')")
    @DeleteMapping("/fuel-logs/{id}")
    public ResponseEntity<Void> deleteFuelLog(@PathVariable Integer truckId, @PathVariable Integer id) {
        service.deleteFuelLog(truckId, id);
        return ResponseEntity.noContent().build();
    }

    // ----- maintenance -----

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/maintenance")
    public List<MaintenanceRecord> maintenance(@PathVariable Integer truckId) {
        return service.listMaintenance(truckId);
    }

    @PreAuthorize("hasAnyRole('ADMIN','DISPATCHER')")
    @PostMapping("/maintenance")
    public MaintenanceRecord addMaintenance(@PathVariable Integer truckId, @RequestBody MaintenanceRecordRequest req) {
        return service.addMaintenance(truckId, req);
    }

    @PreAuthorize("hasAnyRole('ADMIN','DISPATCHER')")
    @DeleteMapping("/maintenance/{id}")
    public ResponseEntity<Void> deleteMaintenance(@PathVariable Integer truckId, @PathVariable Integer id) {
        service.deleteMaintenance(truckId, id);
        return ResponseEntity.noContent().build();
    }

    // ----- odometer -----

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/odometer")
    public List<OdometerReading> odometer(@PathVariable Integer truckId) {
        return service.listOdometer(truckId);
    }

    @PreAuthorize("hasAnyRole('ADMIN','DISPATCHER')")
    @PostMapping("/odometer")
    public OdometerReading addOdometer(@PathVariable Integer truckId, @RequestBody OdometerReadingRequest req) {
        return service.addOdometer(truckId, req);
    }

    // ----- documents -----

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/documents")
    public List<TruckDocument> documents(@PathVariable Integer truckId) {
        return service.listDocuments(truckId);
    }

    @PreAuthorize("hasAnyRole('ADMIN','DISPATCHER')")
    @PostMapping("/documents")
    public TruckDocument addDocument(@PathVariable Integer truckId, @RequestBody TruckDocumentRequest req) {
        return service.addDocument(truckId, req);
    }

    @PreAuthorize("hasAnyRole('ADMIN','DISPATCHER')")
    @DeleteMapping("/documents/{id}")
    public ResponseEntity<Void> deleteDocument(@PathVariable Integer truckId, @PathVariable Integer id) {
        service.deleteDocument(truckId, id);
        return ResponseEntity.noContent().build();
    }

    // ----- preventive schedules -----

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/schedules")
    public List<MaintenanceSchedule> schedules(@PathVariable Integer truckId) {
        return service.listSchedules(truckId);
    }

    @PreAuthorize("hasAnyRole('ADMIN','DISPATCHER')")
    @PutMapping("/schedules")
    public MaintenanceSchedule upsertSchedule(@PathVariable Integer truckId, @RequestBody MaintenanceScheduleRequest req) {
        return service.upsertSchedule(truckId, req);
    }

    @PreAuthorize("hasAnyRole('ADMIN','DISPATCHER')")
    @DeleteMapping("/schedules/{id}")
    public ResponseEntity<Void> deleteSchedule(@PathVariable Integer truckId, @PathVariable Integer id) {
        service.deleteSchedule(truckId, id);
        return ResponseEntity.noContent().build();
    }
}
