package com.fleet.backend.service;

import com.fleet.backend.dto.TelemetryReading;
import com.fleet.backend.entity.Job;
import com.fleet.backend.entity.Truck;
import com.fleet.backend.repository.JobRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Stands in for the on-vehicle hardware that hasn't been bought yet, so the whole
 * chain — ingest, live map, trip distance, fuel estimate and trip verification —
 * can be demonstrated end to end with nothing fitted to a real truck.
 *
 * <p>Trucks with a running job get a plausible random walk around North Macedonia.
 * Trucks whose plate is listed in {@code fleet.telemetry.simulator.parked-plates}
 * report from a fixed spot with only GPS-noise-sized jitter — that is the deliberate
 * "driver says the job is underway but the vehicle never moved" case the client
 * wants surfaced, and it needs to be visible in a demo without waiting for someone
 * to actually lie.</p>
 *
 * <p>Turn it off with {@code fleet.telemetry.simulator.enabled=false} once real
 * devices are reporting.</p>
 */
@Component
@Profile({"dev", "prod"})
@ConditionalOnProperty(name = "fleet.telemetry.simulator.enabled", havingValue = "true", matchIfMissing = true)
public class TelemetrySimulator {

    private static final Logger log = LoggerFactory.getLogger(TelemetrySimulator.class);

    /** Jobs whose truck should be reporting right now. */
    private static final List<String> RUNNING_STATUSES = List.of("IN_PROGRESS", "PAUSED");

    /** Central Skopje — where a truck with no prior fix starts out. */
    private static final double BASE_LAT = 41.9981;
    private static final double BASE_LNG = 21.4254;

    private final JobRepository jobs;
    private final TelemetryService telemetryService;
    private final List<String> parkedPlates;

    /** Per-truck walk state, so successive ticks form a continuous track. */
    private final Map<Integer, double[]> positions = new ConcurrentHashMap<>();
    private final Map<Integer, Double> headings = new ConcurrentHashMap<>();
    private final Random rnd = new Random(42); // fixed seed → a reproducible demo

    public TelemetrySimulator(JobRepository jobs,
                              TelemetryService telemetryService,
                              @Value("${fleet.telemetry.simulator.parked-plates:TE-1006-AA}") String parkedPlates) {
        this.jobs = jobs;
        this.telemetryService = telemetryService;
        this.parkedPlates = List.of(parkedPlates.split("\\s*,\\s*"));
    }

    @Scheduled(initialDelay = 15_000, fixedDelay = 10_000)
    @Transactional
    public void tick() {
        List<Job> running = jobs.findAll().stream()
                .filter(j -> j.getStatus() != null && RUNNING_STATUSES.contains(j.getStatus()))
                .filter(j -> j.getTruck() != null)
                .toList();

        for (Job job : running) {
            Truck truck = job.getTruck();
            boolean parked = parkedPlates.contains(truck.getPlateNumber());
            try {
                telemetryService.record(truck, List.of(nextReading(truck, parked)));
            } catch (Exception e) {
                // A simulator must never take the app down.
                log.warn("Simulated telemetry failed for {}: {}", truck.getPlateNumber(), e.getMessage());
            }
        }
    }

    private TelemetryReading nextReading(Truck truck, boolean parked) {
        double[] pos = positions.computeIfAbsent(truck.getId(), id -> new double[]{
                // Spread trucks out a little so they don't all stack on one pin.
                BASE_LAT + (rnd.nextDouble() - 0.5) * 0.4,
                BASE_LNG + (rnd.nextDouble() - 0.5) * 0.6
        });

        if (parked) {
            // Stationary: only the few metres of jitter a real receiver produces.
            return new TelemetryReading(
                    round6(pos[0] + (rnd.nextDouble() - 0.5) * 0.00004),
                    round6(pos[1] + (rnd.nextDouble() - 0.5) * 0.00004),
                    0.0, null, null, null, Boolean.FALSE, "GPS", null);
        }

        double heading = headings.compute(truck.getId(),
                (id, h) -> ((h == null ? rnd.nextDouble() * 360 : h) + (rnd.nextDouble() - 0.5) * 30 + 360) % 360);
        double speedKph = 45 + rnd.nextDouble() * 40;
        // Distance covered since the previous tick, 10s apart.
        double stepKm = speedKph * (10.0 / 3600.0);
        double rad = Math.toRadians(heading);
        pos[0] += (stepKm / 111.0) * Math.cos(rad);
        pos[1] += (stepKm / (111.0 * Math.cos(Math.toRadians(pos[0])))) * Math.sin(rad);

        return new TelemetryReading(
                round6(pos[0]), round6(pos[1]),
                Math.round(speedKph * 10) / 10.0,
                (double) Math.round(heading),
                null, null, Boolean.TRUE, "GPS", null);
    }

    private static double round6(double v) {
        return Math.round(v * 1_000_000d) / 1_000_000d;
    }

    /** Exposed for the demo: which plates are being held stationary. */
    public List<String> parkedPlates() {
        return new ArrayList<>(parkedPlates);
    }
}
