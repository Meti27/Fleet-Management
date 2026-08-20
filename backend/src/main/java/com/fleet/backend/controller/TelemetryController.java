package com.fleet.backend.controller;

import com.fleet.backend.dto.TelemetryReading;
import com.fleet.backend.dto.TruckPositionDto;
import com.fleet.backend.service.TelemetryService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Truck telemetry: the ingest endpoint the on-vehicle device posts to, plus the
 * staff-facing read side.
 *
 * <p>Ingest is <strong>not</strong> JWT-authenticated — the device is a box, not a
 * user. It presents an {@code X-Device-Key} header which {@link TelemetryService}
 * validates, so {@code SecurityConfig} permits the path and authentication happens
 * in the service. An unknown key returns 401.</p>
 */
@RestController
@RequestMapping("/api/telemetry")
public class TelemetryController {

    private final TelemetryService telemetryService;

    public TelemetryController(TelemetryService telemetryService) {
        this.telemetryService = telemetryService;
    }

    /**
     * Upload readings. Always a JSON array — a device with one reading posts a
     * single-element array, and a device that buffered while out of coverage posts
     * the backlog in one call.
     */
    @PostMapping
    public Map<String, Integer> ingest(@RequestHeader(value = "X-Device-Key", required = false) String deviceKey,
                                       @RequestBody List<TelemetryReading> readings) {
        return Map.of("stored", telemetryService.ingest(deviceKey, readings));
    }

    /** Latest known position of every reporting truck (staff only). */
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/latest")
    public List<TruckPositionDto> latest() {
        return telemetryService.latestPerTruck();
    }
}
