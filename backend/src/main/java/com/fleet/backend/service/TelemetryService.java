package com.fleet.backend.service;

import com.fleet.backend.dto.DriverLocationDto;
import com.fleet.backend.dto.TelemetryReading;
import com.fleet.backend.dto.TruckPositionDto;
import com.fleet.backend.entity.Job;
import com.fleet.backend.entity.OdometerReading;
import com.fleet.backend.entity.Truck;
import com.fleet.backend.entity.TruckDevice;
import com.fleet.backend.entity.TruckTelemetry;
import com.fleet.backend.repository.JobRepository;
import com.fleet.backend.repository.OdometerReadingRepository;
import com.fleet.backend.repository.TruckDeviceRepository;
import com.fleet.backend.repository.TruckTelemetryRepository;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;

import static com.fleet.backend.util.GeoUtils.haversineKm;
import static com.fleet.backend.util.GeoUtils.round2;

/**
 * Ingest and read side of truck-mounted telemetry (GPS tracker or OBD dongle).
 *
 * <p>The vehicle reports independently of the driver, which is what makes it usable
 * as a check on the driver's claims — see {@code TripVerificationService}.</p>
 *
 * <p>Uploads authenticate with a device key rather than a JWT: the box is not a user
 * and has no session. Keys are compared by SHA-256 rather than BCrypt because they
 * are long random strings, not human-chosen passwords — BCrypt's deliberate slowness
 * would throttle a high-frequency ingest path for no security gain.</p>
 */
@Service
public class TelemetryService {

    /** Statuses during which a reading is attributed to the truck's running job. */
    private static final List<String> RUNNING_STATUSES = List.of("IN_PROGRESS", "PAUSED");

    private final TruckTelemetryRepository telemetry;
    private final TruckDeviceRepository devices;
    private final JobRepository jobs;
    private final OdometerReadingRepository odometerReadings;
    private final SimpMessagingTemplate messaging;

    public TelemetryService(TruckTelemetryRepository telemetry,
                            TruckDeviceRepository devices,
                            JobRepository jobs,
                            OdometerReadingRepository odometerReadings,
                            SimpMessagingTemplate messaging) {
        this.telemetry = telemetry;
        this.devices = devices;
        this.jobs = jobs;
        this.odometerReadings = odometerReadings;
        this.messaging = messaging;
    }

    // ------------------------------------------------------------------ ingest

    /**
     * Store a batch of readings from one device. Devices buffer while out of
     * coverage, so a batch is the normal case and a single reading is a batch of one.
     *
     * @return how many readings were stored
     */
    @Transactional
    public int ingest(String deviceKey, List<TelemetryReading> readings) {
        TruckDevice device = authenticate(deviceKey);
        if (readings == null || readings.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No readings supplied");
        }
        int stored = record(device.getTruck(), readings);
        device.setLastSeenAt(LocalDateTime.now());
        devices.save(device);
        return stored;
    }

    /**
     * Store readings already attributed to a truck, skipping device authentication.
     * Used by the demo simulator, which stands in for hardware that has not been
     * chosen yet; real devices always arrive through {@link #ingest}.
     */
    @Transactional
    public int record(Truck truck, List<TelemetryReading> readings) {
        // Resolved once per batch: a buffered upload belongs to one trip.
        Job runningJob = jobs
                .findFirstByTruck_IdAndStatusInOrderByPickupTimeDesc(truck.getId(), RUNNING_STATUSES)
                .orElse(null);

        TruckTelemetry newest = null;
        int stored = 0;
        for (TelemetryReading r : readings) {
            if (r == null) continue;
            boolean hasPosition = r.latitude() != null && r.longitude() != null;
            if (!hasPosition && r.odometerKm() == null) {
                // Nothing usable — a keepalive with no payload. Skip rather than 400
                // the whole batch, so one bad frame can't block a buffered upload.
                continue;
            }
            TruckTelemetry saved = telemetry.save(TruckTelemetry.builder()
                    .truck(truck)
                    .job(runningJob)
                    .latitude(r.latitude())
                    .longitude(r.longitude())
                    .speedKph(r.speedKph())
                    .heading(r.heading())
                    .odometerKm(r.odometerKm())
                    .fuelLevelPct(r.fuelLevelPct())
                    .engineOn(r.engineOn())
                    .source(normalizeSource(r.source()))
                    .recordedAt(r.recordedAt())
                    .build());
            stored++;
            if (newest == null || saved.getRecordedAt().isAfter(newest.getRecordedAt())) {
                newest = saved;
            }
        }

        if (newest != null) {
            broadcast(newest, runningJob);
        }
        return stored;
    }

    /**
     * Push the newest position to the admin live map.
     *
     * <p>The map is keyed by driver, so a reading is only broadcast on the existing
     * {@code /topic/locations} topic when a running job identifies who is driving.
     * A truck reporting with no active job is still stored — it simply doesn't need
     * to appear on the live map.</p>
     */
    private void broadcast(TruckTelemetry newest, Job runningJob) {
        if (!newest.hasPosition() || runningJob == null || runningJob.getDriver() == null) {
            return;
        }
        messaging.convertAndSend(LocationService.TOPIC, new DriverLocationDto(
                runningJob.getDriver().getId(),
                runningJob.getDriver().getName(),
                runningJob.getId(),
                runningJob.getTitle(),
                newest.getLatitude(),
                newest.getLongitude(),
                newest.getSpeedKph(),
                newest.getHeading(),
                newest.getRecordedAt()));
    }

    private TruckDevice authenticate(String deviceKey) {
        if (deviceKey == null || deviceKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing X-Device-Key");
        }
        return devices.findByDeviceKeyHashAndActiveTrue(sha256(deviceKey.trim()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unknown device key"));
    }

    private static String normalizeSource(String raw) {
        if (raw == null || raw.isBlank()) return "GPS";
        String v = raw.trim().toUpperCase();
        return v.equals("OBD") ? "OBD" : "GPS";
    }

    /** Hash a device key for storage/lookup. */
    public static String sha256(String value) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    // -------------------------------------------------------------------- read

    /** Current position of every truck that has reported one. */
    @Transactional(readOnly = true)
    public List<TruckPositionDto> latestPerTruck() {
        return telemetry.findLatestPerTruck().stream()
                .filter(TruckTelemetry::hasPosition)
                .map(TruckPositionDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<TruckPositionDto> latestForTruck(Integer truckId) {
        return telemetry.findFirstByTruck_IdOrderByRecordedAtDesc(truckId).map(TruckPositionDto::from);
    }

    /** The vehicle's own track for a job, oldest first. */
    @Transactional(readOnly = true)
    public List<TruckTelemetry> trackForJob(Integer jobId) {
        return telemetry.findByJob_IdOrderByRecordedAtAsc(jobId);
    }

    /** Whether any truck device has ever reported for this job. */
    @Transactional(readOnly = true)
    public boolean hasDataForJob(Integer jobId) {
        return !telemetry.findByJob_IdOrderByRecordedAtAsc(jobId).isEmpty();
    }

    /**
     * Distance the vehicle actually covered on a job, summed over consecutive fixes.
     * Prefers the OBD odometer when the device reports one (a real reading beats an
     * integrated GPS track), otherwise falls back to haversine over the positions.
     */
    public static double distanceKm(List<TruckTelemetry> track) {
        Integer firstOdo = null;
        Integer lastOdo = null;
        for (TruckTelemetry t : track) {
            if (t.getOdometerKm() != null) {
                if (firstOdo == null) firstOdo = t.getOdometerKm();
                lastOdo = t.getOdometerKm();
            }
        }
        if (firstOdo != null && lastOdo != null && lastOdo > firstOdo) {
            return lastOdo - firstOdo;
        }

        double km = 0;
        TruckTelemetry prev = null;
        for (TruckTelemetry t : track) {
            if (!t.hasPosition()) continue;
            if (prev != null) {
                km += haversineKm(prev.getLatitude(), prev.getLongitude(),
                        t.getLatitude(), t.getLongitude());
            }
            prev = t;
        }
        return round2(km);
    }

    /**
     * Record the truck's mileage after a completed job.
     *
     * <p>Uses the OBD odometer when the device reports one, otherwise adds the
     * telemetry distance to the truck's last known reading. Written as an ordinary
     * {@code odometer_readings} row with source {@code TELEMETRY}, which is why
     * {@link MaintenanceReminderService} picks it up with no changes at all — it
     * already derives "current km" from {@code max(reading_km)}.</p>
     */
    @Transactional
    public void writeOdometerForCompletedJob(Job job) {
        if (job == null || job.getTruck() == null) return;
        List<TruckTelemetry> track = telemetry.findByJob_IdOrderByRecordedAtAsc(job.getId());
        if (track.isEmpty()) return;

        Integer obdKm = track.stream()
                .map(TruckTelemetry::getOdometerKm)
                .filter(java.util.Objects::nonNull)
                .max(Integer::compareTo)
                .orElse(null);

        Integer readingKm;
        if (obdKm != null) {
            readingKm = obdKm;
        } else {
            Integer lastKnown = odometerReadings.findMaxKm(job.getTruck().getId());
            double covered = distanceKm(track);
            // Without a baseline there is nothing to add to — a GPS track alone
            // gives a delta, not an absolute odometer value.
            if (lastKnown == null || covered <= 0) return;
            readingKm = lastKnown + (int) Math.round(covered);
        }

        odometerReadings.save(OdometerReading.builder()
                .truck(job.getTruck())
                .readingKm(readingKm)
                .recordedAt(LocalDateTime.now())
                .source("TELEMETRY")
                .note("Job #" + job.getId())
                .build());
    }

    /**
     * Straight-line distance between the two furthest-apart fixes on a track.
     *
     * <p>Distinct from {@link #distanceKm}: a truck idling with jittery GPS can
     * accumulate a nonzero <em>path</em> length while never actually going anywhere.
     * Displacement is what tells you the vehicle genuinely left.</p>
     */
    public static double displacementKm(List<TruckTelemetry> track) {
        List<TruckTelemetry> fixes = track.stream().filter(TruckTelemetry::hasPosition).toList();
        if (fixes.size() < 2) return 0;
        double max = 0;
        TruckTelemetry origin = fixes.get(0);
        for (TruckTelemetry t : fixes) {
            max = Math.max(max, haversineKm(origin.getLatitude(), origin.getLongitude(),
                    t.getLatitude(), t.getLongitude()));
        }
        return round2(max);
    }
}
