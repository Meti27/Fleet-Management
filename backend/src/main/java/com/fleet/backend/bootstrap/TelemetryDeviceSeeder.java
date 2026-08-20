package com.fleet.backend.bootstrap;

import com.fleet.backend.entity.Truck;
import com.fleet.backend.entity.TruckDevice;
import com.fleet.backend.repository.TruckDeviceRepository;
import com.fleet.backend.repository.TruckRepository;
import com.fleet.backend.service.TelemetryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Gives every demo truck a telemetry device, so the ingest endpoint can be exercised
 * before any real hardware is chosen.
 *
 * <p>Keys are derived deterministically from the plate, which makes them predictable
 * — acceptable only because this seeds a demo. Real devices must be registered with
 * random keys. The plaintext key is logged under the {@code dev} profile only, so it
 * can be copied into a curl call; it is never logged in prod.</p>
 *
 * <p>Idempotent: skips any truck that already has a device.</p>
 */
@Component
@Profile({"dev", "prod"})
@Order(3) // after users (1) and demo data (2), so the trucks exist
public class TelemetryDeviceSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(TelemetryDeviceSeeder.class);

    private final TruckRepository trucks;
    private final TruckDeviceRepository devices;
    private final Environment env;

    public TelemetryDeviceSeeder(TruckRepository trucks, TruckDeviceRepository devices, Environment env) {
        this.trucks = trucks;
        this.devices = devices;
        this.env = env;
    }

    /** The demo key for a given plate. Predictable on purpose — demo only. */
    public static String demoKeyFor(String plateNumber) {
        return "demo-device-" + plateNumber.toLowerCase().replace("-", "");
    }

    @Override
    public void run(String... args) {
        boolean dev = List.of(env.getActiveProfiles()).contains("dev");

        for (Truck truck : trucks.findAll()) {
            if (!devices.findByTruck_Id(truck.getId()).isEmpty()) {
                continue;
            }
            String key = demoKeyFor(truck.getPlateNumber());
            devices.save(TruckDevice.builder()
                    .truck(truck)
                    .deviceKeyHash(TelemetryService.sha256(key))
                    .label("Demo tracker " + truck.getPlateNumber())
                    .active(true)
                    .build());

            if (dev) {
                log.info("Seeded telemetry device for {} — X-Device-Key: {}", truck.getPlateNumber(), key);
            }
        }
    }
}
