package com.fleet.backend.service;

import com.fleet.backend.dto.ReminderDto;
import com.fleet.backend.entity.MaintenanceRecord;
import com.fleet.backend.entity.MaintenanceSchedule;
import com.fleet.backend.entity.Truck;
import com.fleet.backend.entity.TruckDocument;
import com.fleet.backend.repository.MaintenanceRecordRepository;
import com.fleet.backend.repository.MaintenanceScheduleRepository;
import com.fleet.backend.repository.OdometerReadingRepository;
import com.fleet.backend.repository.TruckDocumentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Computes "due soon / overdue" alerts for the admin dashboard from preventive
 * maintenance schedules (km- or time-based) and document expiry dates.
 *
 * Read methods run in a read-only transaction so lazy {@code truck} references
 * can be dereferenced while building the DTOs.
 */
@Service
public class MaintenanceReminderService {

    /** A km-based service is flagged when within this many km of due. */
    private static final int DUE_SOON_KM = 1000;
    /** A time-based service is flagged when within this many days of due. */
    private static final int DUE_SOON_DAYS = 30;
    /** A document is flagged when within this many days of expiry. */
    private static final int DOC_DUE_SOON_DAYS = 30;

    private static final String OVERDUE = "OVERDUE";
    private static final String DUE_SOON = "DUE_SOON";

    private final MaintenanceScheduleRepository scheduleRepository;
    private final MaintenanceRecordRepository maintenanceRepository;
    private final TruckDocumentRepository documentRepository;
    private final OdometerReadingRepository odometerRepository;

    public MaintenanceReminderService(MaintenanceScheduleRepository scheduleRepository,
                                      MaintenanceRecordRepository maintenanceRepository,
                                      TruckDocumentRepository documentRepository,
                                      OdometerReadingRepository odometerRepository) {
        this.scheduleRepository = scheduleRepository;
        this.maintenanceRepository = maintenanceRepository;
        this.documentRepository = documentRepository;
        this.odometerRepository = odometerRepository;
    }

    /** All open reminders across the fleet, most urgent first. */
    @Transactional(readOnly = true)
    public List<ReminderDto> allReminders() {
        List<ReminderDto> out = new ArrayList<>();
        Map<Integer, Integer> currentKmCache = new HashMap<>();

        for (MaintenanceSchedule schedule : scheduleRepository.findByActiveTrue()) {
            Integer currentKm = currentKmCache.computeIfAbsent(
                    schedule.getTruck().getId(), odometerRepository::findMaxKm);
            ReminderDto r = scheduleReminder(schedule, currentKm);
            if (r != null) out.add(r);
        }
        for (TruckDocument doc : documentRepository.findAllByOrderByExpiresOnAsc()) {
            ReminderDto r = documentReminder(doc);
            if (r != null) out.add(r);
        }
        out.sort(REMINDER_ORDER);
        return out;
    }

    /** Open reminders for a single truck. */
    @Transactional(readOnly = true)
    public List<ReminderDto> remindersForTruck(Integer truckId) {
        List<ReminderDto> out = new ArrayList<>();
        Integer currentKm = odometerRepository.findMaxKm(truckId);

        for (MaintenanceSchedule schedule : scheduleRepository.findByTruck_Id(truckId)) {
            if (Boolean.FALSE.equals(schedule.getActive())) continue;
            ReminderDto r = scheduleReminder(schedule, currentKm);
            if (r != null) out.add(r);
        }
        for (TruckDocument doc : documentRepository.findByTruck_IdOrderByExpiresOnAsc(truckId)) {
            ReminderDto r = documentReminder(doc);
            if (r != null) out.add(r);
        }
        out.sort(REMINDER_ORDER);
        return out;
    }

    // ---------------------------------------------------------------- internals

    private ReminderDto scheduleReminder(MaintenanceSchedule schedule, Integer currentKm) {
        Truck truck = schedule.getTruck();

        // Establish the last service point: prefer the latest matching record,
        // fall back to the baseline stored on the schedule.
        MaintenanceRecord latest = maintenanceRepository
                .findFirstByTruck_IdAndTypeOrderByPerformedAtDesc(truck.getId(), schedule.getType())
                .orElse(null);
        Integer lastKm = latest != null && latest.getOdometerKm() != null
                ? latest.getOdometerKm() : schedule.getLastServiceKm();
        LocalDate lastDate = latest != null
                ? latest.getPerformedAt().toLocalDate()
                : (schedule.getLastServiceAt() != null ? schedule.getLastServiceAt().toLocalDate() : null);

        Integer dueInKm = null;
        Long dueInDays = null;
        LocalDate dueDate = null;
        String status = null;

        // km-based component
        if (schedule.getIntervalKm() != null && lastKm != null && currentKm != null) {
            dueInKm = (lastKm + schedule.getIntervalKm()) - currentKm;
            status = escalate(status, dueInKm <= 0 ? OVERDUE : (dueInKm <= DUE_SOON_KM ? DUE_SOON : null));
        }
        // time-based component
        if (schedule.getIntervalMonths() != null && lastDate != null) {
            dueDate = lastDate.plusMonths(schedule.getIntervalMonths());
            dueInDays = ChronoUnit.DAYS.between(LocalDate.now(), dueDate);
            status = escalate(status, dueInDays <= 0 ? OVERDUE : (dueInDays <= DUE_SOON_DAYS ? DUE_SOON : null));
        }

        if (status == null) return null; // not due, or not enough data to tell

        return new ReminderDto(
                truck.getId(), truck.getPlateNumber(),
                "MAINTENANCE", schedule.getType(), status,
                dueInKm, dueInDays, dueDate,
                maintenanceMessage(schedule.getType(), status, dueInKm, dueInDays));
    }

    private ReminderDto documentReminder(TruckDocument doc) {
        long dueInDays = ChronoUnit.DAYS.between(LocalDate.now(), doc.getExpiresOn());
        String status = dueInDays < 0 ? OVERDUE : (dueInDays <= DOC_DUE_SOON_DAYS ? DUE_SOON : null);
        if (status == null) return null;

        Truck truck = doc.getTruck();
        String msg = OVERDUE.equals(status)
                ? doc.getType() + " expired " + Math.abs(dueInDays) + " day(s) ago"
                : doc.getType() + " expires in " + dueInDays + " day(s)";
        return new ReminderDto(
                truck.getId(), truck.getPlateNumber(),
                "DOCUMENT", doc.getType(), status,
                null, dueInDays, doc.getExpiresOn(), msg);
    }

    private static String maintenanceMessage(String type, String status, Integer dueInKm, Long dueInDays) {
        StringBuilder sb = new StringBuilder(type).append(' ')
                .append(OVERDUE.equals(status) ? "overdue" : "due soon");
        if (dueInKm != null) {
            sb.append(dueInKm <= 0 ? " by " + Math.abs(dueInKm) + " km" : " in " + dueInKm + " km");
        }
        if (dueInDays != null) {
            sb.append(dueInKm != null ? " /" : "");
            sb.append(dueInDays <= 0 ? " " + Math.abs(dueInDays) + " day(s) ago" : " in " + dueInDays + " day(s)");
        }
        return sb.toString();
    }

    /** OVERDUE beats DUE_SOON beats nothing. */
    private static String escalate(String current, String candidate) {
        if (OVERDUE.equals(current) || OVERDUE.equals(candidate)) return OVERDUE;
        if (DUE_SOON.equals(current) || DUE_SOON.equals(candidate)) return DUE_SOON;
        return current;
    }

    /** Overdue first, then by soonest due date. */
    private static final Comparator<ReminderDto> REMINDER_ORDER = Comparator
            .comparingInt((ReminderDto r) -> OVERDUE.equals(r.status()) ? 0 : 1)
            .thenComparing(r -> r.dueDate() == null ? LocalDate.MAX : r.dueDate());
}
