package com.fleet.backend.service;

import com.fleet.backend.dto.*;
import com.fleet.backend.entity.*;
import com.fleet.backend.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

/**
 * Fleet health logging: fuel, maintenance, odometer, documents and preventive
 * schedules. All operations are scoped to a truck. Whenever a fuel or
 * maintenance entry carries an odometer value it is mirrored into
 * {@code odometer_readings}, so "current km" always has a single source of truth.
 */
@Service
public class FleetMaintenanceService {

    private final TruckRepository truckRepository;
    private final DriverRepository driverRepository;
    private final FuelLogRepository fuelLogRepository;
    private final MaintenanceRecordRepository maintenanceRepository;
    private final OdometerReadingRepository odometerRepository;
    private final TruckDocumentRepository documentRepository;
    private final MaintenanceScheduleRepository scheduleRepository;
    private final MaintenanceReminderService reminderService;

    public FleetMaintenanceService(TruckRepository truckRepository,
                                   DriverRepository driverRepository,
                                   FuelLogRepository fuelLogRepository,
                                   MaintenanceRecordRepository maintenanceRepository,
                                   OdometerReadingRepository odometerRepository,
                                   TruckDocumentRepository documentRepository,
                                   MaintenanceScheduleRepository scheduleRepository,
                                   MaintenanceReminderService reminderService) {
        this.truckRepository = truckRepository;
        this.driverRepository = driverRepository;
        this.fuelLogRepository = fuelLogRepository;
        this.maintenanceRepository = maintenanceRepository;
        this.odometerRepository = odometerRepository;
        this.documentRepository = documentRepository;
        this.scheduleRepository = scheduleRepository;
        this.reminderService = reminderService;
    }

    // ---------------------------------------------------------------- Fuel

    public List<FuelLog> listFuelLogs(Integer truckId) {
        requireTruck(truckId);
        return fuelLogRepository.findByTruck_IdOrderByFilledAtDesc(truckId);
    }

    @Transactional
    public FuelLog addFuelLog(Integer truckId, FuelLogRequest req) {
        Truck truck = requireTruck(truckId);
        if (req.liters() == null || req.liters().signum() <= 0) {
            throw badRequest("liters must be a positive number");
        }
        FuelLog log = FuelLog.builder()
                .truck(truck)
                .filledAt(req.filledAt())
                .liters(req.liters())
                .costEur(req.costEur())
                .odometerKm(req.odometerKm())
                .fullTank(req.fullTank())
                .station(req.station())
                .note(req.note())
                .build();
        if (req.driverId() != null) {
            log.setDriver(driverRepository.findById(req.driverId())
                    .orElseThrow(() -> badRequest("Driver not found")));
        }
        FuelLog saved = fuelLogRepository.save(log);
        mirrorOdometer(truck, req.odometerKm(), saved.getFilledAt(), "FUEL");
        return saved;
    }

    @Transactional
    public void deleteFuelLog(Integer truckId, Integer id) {
        FuelLog log = fuelLogRepository.findById(id)
                .orElseThrow(() -> notFound("Fuel log not found"));
        requireOwnership(log.getTruck(), truckId);
        fuelLogRepository.delete(log);
    }

    // --------------------------------------------------------- Maintenance

    public List<MaintenanceRecord> listMaintenance(Integer truckId) {
        requireTruck(truckId);
        return maintenanceRepository.findByTruck_IdOrderByPerformedAtDesc(truckId);
    }

    @Transactional
    public MaintenanceRecord addMaintenance(Integer truckId, MaintenanceRecordRequest req) {
        Truck truck = requireTruck(truckId);
        if (req.type() == null || req.type().isBlank()) {
            throw badRequest("type is required");
        }
        MaintenanceRecord rec = MaintenanceRecord.builder()
                .truck(truck)
                .type(req.type().trim().toUpperCase())
                .performedAt(req.performedAt())
                .odometerKm(req.odometerKm())
                .costEur(req.costEur())
                .vendor(req.vendor())
                .notes(req.notes())
                .build();
        MaintenanceRecord saved = maintenanceRepository.save(rec);
        mirrorOdometer(truck, req.odometerKm(), saved.getPerformedAt(), "MAINTENANCE");
        return saved;
    }

    @Transactional
    public void deleteMaintenance(Integer truckId, Integer id) {
        MaintenanceRecord rec = maintenanceRepository.findById(id)
                .orElseThrow(() -> notFound("Maintenance record not found"));
        requireOwnership(rec.getTruck(), truckId);
        maintenanceRepository.delete(rec);
    }

    // ------------------------------------------------------------ Odometer

    public List<OdometerReading> listOdometer(Integer truckId) {
        requireTruck(truckId);
        return odometerRepository.findByTruck_IdOrderByRecordedAtDesc(truckId);
    }

    @Transactional
    public OdometerReading addOdometer(Integer truckId, OdometerReadingRequest req) {
        Truck truck = requireTruck(truckId);
        if (req.readingKm() == null || req.readingKm() < 0) {
            throw badRequest("readingKm must be zero or greater");
        }
        OdometerReading reading = OdometerReading.builder()
                .truck(truck)
                .readingKm(req.readingKm())
                .recordedAt(req.recordedAt())
                .source("MANUAL")
                .note(req.note())
                .build();
        return odometerRepository.save(reading);
    }

    // ------------------------------------------------------------ Documents

    public List<TruckDocument> listDocuments(Integer truckId) {
        requireTruck(truckId);
        return documentRepository.findByTruck_IdOrderByExpiresOnAsc(truckId);
    }

    @Transactional
    public TruckDocument addDocument(Integer truckId, TruckDocumentRequest req) {
        Truck truck = requireTruck(truckId);
        if (req.type() == null || req.type().isBlank()) throw badRequest("type is required");
        if (req.expiresOn() == null) throw badRequest("expiresOn is required");
        TruckDocument doc = TruckDocument.builder()
                .truck(truck)
                .type(req.type().trim().toUpperCase())
                .documentNumber(req.documentNumber())
                .issuedOn(req.issuedOn())
                .expiresOn(req.expiresOn())
                .note(req.note())
                .build();
        return documentRepository.save(doc);
    }

    @Transactional
    public void deleteDocument(Integer truckId, Integer id) {
        TruckDocument doc = documentRepository.findById(id)
                .orElseThrow(() -> notFound("Document not found"));
        requireOwnership(doc.getTruck(), truckId);
        documentRepository.delete(doc);
    }

    // ------------------------------------------------------------ Schedules

    public List<MaintenanceSchedule> listSchedules(Integer truckId) {
        requireTruck(truckId);
        return scheduleRepository.findByTruck_Id(truckId);
    }

    /** Create or update the schedule for a (truck, type) pair. */
    @Transactional
    public MaintenanceSchedule upsertSchedule(Integer truckId, MaintenanceScheduleRequest req) {
        Truck truck = requireTruck(truckId);
        if (req.type() == null || req.type().isBlank()) throw badRequest("type is required");
        if (req.intervalKm() == null && req.intervalMonths() == null) {
            throw badRequest("Set at least one of intervalKm or intervalMonths");
        }
        String type = req.type().trim().toUpperCase();
        MaintenanceSchedule schedule = scheduleRepository.findByTruck_IdAndType(truckId, type)
                .orElseGet(() -> MaintenanceSchedule.builder().truck(truck).type(type).build());
        schedule.setIntervalKm(req.intervalKm());
        schedule.setIntervalMonths(req.intervalMonths());
        schedule.setLastServiceKm(req.lastServiceKm());
        schedule.setLastServiceAt(req.lastServiceAt());
        schedule.setActive(req.active() == null ? Boolean.TRUE : req.active());
        schedule.setNote(req.note());
        return scheduleRepository.save(schedule);
    }

    @Transactional
    public void deleteSchedule(Integer truckId, Integer id) {
        MaintenanceSchedule schedule = scheduleRepository.findById(id)
                .orElseThrow(() -> notFound("Schedule not found"));
        requireOwnership(schedule.getTruck(), truckId);
        scheduleRepository.delete(schedule);
    }

    // ------------------------------------------------------------- Summary

    public TruckMaintenanceSummary truckSummary(Integer truckId) {
        Truck truck = requireTruck(truckId);

        List<FuelLog> fuel = fuelLogRepository.findByTruck_IdOrderByFilledAtDesc(truckId);
        List<MaintenanceRecord> maint = maintenanceRepository.findByTruck_IdOrderByPerformedAtDesc(truckId);

        BigDecimal totalFuelCost = fuel.stream()
                .map(FuelLog::getCostEur).filter(c -> c != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalMaintenanceCost = maint.stream()
                .map(MaintenanceRecord::getCostEur).filter(c -> c != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        LocalDateTime lastFuelAt = fuel.isEmpty() ? null : fuel.get(0).getFilledAt();
        LocalDateTime lastMaintenanceAt = maint.isEmpty() ? null : maint.get(0).getPerformedAt();

        return new TruckMaintenanceSummary(
                truck.getId(),
                truck.getPlateNumber(),
                currentOdometerKm(truckId),
                totalFuelCost,
                totalMaintenanceCost,
                computeEfficiency(truckId),
                reminderService.remindersForTruck(truckId).size(),
                lastFuelAt,
                lastMaintenanceAt
        );
    }

    /** Current kilometres = highest recorded reading (manual, fuel or maintenance). */
    public Integer currentOdometerKm(Integer truckId) {
        return odometerRepository.findMaxKm(truckId);
    }

    /**
     * Average fuel consumption in L/100km, computed across fuel logs that carry an
     * odometer value: litres burned between the first and last such fill divided
     * by the distance covered. Returns null when there isn't enough data.
     */
    Double computeEfficiency(Integer truckId) {
        List<FuelLog> logs = fuelLogRepository.findByTruck_IdOrderByFilledAtAsc(truckId).stream()
                .filter(f -> f.getOdometerKm() != null && f.getLiters() != null)
                .sorted(Comparator.comparing(FuelLog::getOdometerKm))
                .toList();
        if (logs.size() < 2) return null;

        int distance = logs.get(logs.size() - 1).getOdometerKm() - logs.get(0).getOdometerKm();
        if (distance <= 0) return null;

        // Fuel added after the baseline fill is what covered the measured distance.
        BigDecimal litersConsumed = logs.stream().skip(1)
                .map(FuelLog::getLiters)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return litersConsumed
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(distance), 2, RoundingMode.HALF_UP)
                .doubleValue();
    }

    // -------------------------------------------------------------- Helpers

    private void mirrorOdometer(Truck truck, Integer km, LocalDateTime at, String source) {
        if (km == null) return;
        odometerRepository.save(OdometerReading.builder()
                .truck(truck)
                .readingKm(km)
                .recordedAt(at == null ? LocalDateTime.now() : at)
                .source(source)
                .build());
    }

    private Truck requireTruck(Integer truckId) {
        return truckRepository.findById(truckId)
                .orElseThrow(() -> notFound("Truck not found"));
    }

    private void requireOwnership(Truck truck, Integer truckId) {
        if (truck == null || !truck.getId().equals(truckId)) {
            throw notFound("Record does not belong to this truck");
        }
    }

    private static ResponseStatusException badRequest(String msg) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, msg);
    }

    private static ResponseStatusException notFound(String msg) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, msg);
    }
}
