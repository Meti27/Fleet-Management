package com.fleet.backend.service;

import com.fleet.backend.dto.DriverLocationDto;
import com.fleet.backend.dto.LocationPingRequest;
import com.fleet.backend.dto.TripFuelEstimate;
import com.fleet.backend.entity.Driver;
import com.fleet.backend.entity.FuelLog;
import com.fleet.backend.entity.Job;
import com.fleet.backend.entity.LocationPing;
import com.fleet.backend.entity.Truck;
import com.fleet.backend.repository.FuelLogRepository;
import com.fleet.backend.repository.JobRepository;
import com.fleet.backend.repository.LocationPingRepository;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.List;

/**
 * Live GPS tracking (Phase 3). Drivers post pings; each is persisted (history is
 * kept) and broadcast to the admin live map over the STOMP topic
 * {@code /topic/locations}. The map's initial load reads {@link #latestLocations()}.
 */
@Service
public class LocationService {

    /** STOMP destination the admin live map subscribes to. */
    public static final String TOPIC = "/topic/locations";

    private final LocationPingRepository pings;
    private final JobRepository jobs;
    private final FuelLogRepository fuelLogs;
    private final SimpMessagingTemplate messaging;

    public LocationService(LocationPingRepository pings, JobRepository jobs,
                           FuelLogRepository fuelLogs, SimpMessagingTemplate messaging) {
        this.pings = pings;
        this.jobs = jobs;
        this.fuelLogs = fuelLogs;
        this.messaging = messaging;
    }

    /** Persist a ping for {@code driver} and push the new position to the live map. */
    @Transactional
    public DriverLocationDto record(Driver driver, LocationPingRequest req) {
        if (req == null || req.latitude() == null || req.longitude() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "latitude and longitude are required");
        }

        Job job = null;
        if (req.jobId() != null) {
            job = jobs.findById(req.jobId()).orElse(null);
            // Only attribute the ping to a job the driver actually owns.
            if (job != null && (job.getDriver() == null || !job.getDriver().getId().equals(driver.getId()))) {
                job = null;
            }
        }

        LocationPing saved = pings.save(LocationPing.builder()
                .driver(driver)
                .job(job)
                .latitude(req.latitude())
                .longitude(req.longitude())
                .speedKph(req.speedKph())
                .heading(req.heading())
                .build());

        DriverLocationDto dto = DriverLocationDto.from(saved);
        messaging.convertAndSend(TOPIC, dto);
        return dto;
    }

    /** Current position of every driver that has reported one (live-map initial load). */
    @Transactional(readOnly = true)
    public List<DriverLocationDto> latestLocations() {
        return pings.findLatestPerDriver().stream()
                .map(DriverLocationDto::from)
                .toList();
    }

    /**
     * GPS-derived trip summary for a job: distance from the ordered pings (haversine),
     * average speed, duration, and a fuel/cost estimate using the truck's rated
     * consumption (L/100km) and the average €/L from that truck's fuel history.
     */
    @Transactional(readOnly = true)
    public TripFuelEstimate estimateTrip(Integer jobId) {
        Job job = jobs.findById(jobId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found"));

        List<LocationPing> track = pings.findByJob_IdOrderByRecordedAtAsc(jobId);
        if (track.size() < 2) {
            return TripFuelEstimate.distanceOnly(jobId, track.size(), 0.0, null, null);
        }

        double distanceKm = 0;
        for (int i = 1; i < track.size(); i++) {
            distanceKm += haversineKm(
                    track.get(i - 1).getLatitude(), track.get(i - 1).getLongitude(),
                    track.get(i).getLatitude(), track.get(i).getLongitude());
        }
        distanceKm = round2(distanceKm);

        Long durationMin = null;
        Double avgSpeedKph = null;
        Duration d = Duration.between(track.get(0).getRecordedAt(),
                track.get(track.size() - 1).getRecordedAt());
        if (!d.isZero() && !d.isNegative()) {
            durationMin = d.toMinutes();
            // Only report average speed over a meaningful window — a handful of
            // pings within seconds would otherwise yield an absurd figure.
            if (d.toSeconds() >= 60) {
                avgSpeedKph = round2(distanceKm / (d.toSeconds() / 3600.0));
            }
        }

        Truck truck = job.getTruck();
        Double rate = truck != null ? truck.getFuelConsumptionL100km() : null;
        if (rate == null) {
            return TripFuelEstimate.distanceOnly(jobId, track.size(), distanceKm, avgSpeedKph, durationMin);
        }

        double liters = round2(distanceKm * rate / 100.0);
        Double cost = null;
        Double pricePerL = avgFuelPriceEurPerLiter(truck.getId());
        if (pricePerL != null) {
            cost = round2(liters * pricePerL);
        }

        return new TripFuelEstimate(jobId, track.size(), distanceKm, avgSpeedKph, durationMin,
                rate, liters, cost);
    }

    /** Average €/L across this truck's fuel logs that carry both cost and litres. */
    private Double avgFuelPriceEurPerLiter(Integer truckId) {
        List<FuelLog> logs = fuelLogs.findByTruck_IdOrderByFilledAtAsc(truckId);
        double total = 0;
        int n = 0;
        for (FuelLog f : logs) {
            if (f.getCostEur() != null && f.getLiters() != null
                    && f.getLiters().compareTo(BigDecimal.ZERO) > 0) {
                total += f.getCostEur().doubleValue() / f.getLiters().doubleValue();
                n++;
            }
        }
        return n == 0 ? null : round2(total / n);
    }

    /** Great-circle distance between two lat/lng points, in kilometres. */
    private static double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private static double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
