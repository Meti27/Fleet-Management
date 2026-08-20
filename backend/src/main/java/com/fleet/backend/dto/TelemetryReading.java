package com.fleet.backend.dto;

import java.time.LocalDateTime;

/**
 * One reading uploaded by a truck-mounted device.
 *
 * <p>Everything is optional except that a reading must carry <em>something</em>
 * useful — a position or an odometer value — which the service enforces. A plain
 * GPS tracker fills the position fields; an OBD dongle may fill only
 * {@code odometerKm} / {@code fuelLevelPct} / {@code engineOn}.</p>
 *
 * <p>{@code recordedAt} is the time on the device, so buffered readings uploaded
 * late keep their true timestamps. It defaults to now when absent.</p>
 */
public record TelemetryReading(
        Double latitude,
        Double longitude,
        Double speedKph,
        Double heading,
        Integer odometerKm,
        Double fuelLevelPct,
        Boolean engineOn,
        String source,
        LocalDateTime recordedAt
) {}
