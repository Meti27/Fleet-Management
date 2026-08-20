package com.fleet.backend.dto;

import com.fleet.backend.entity.TruckTelemetry;

import java.time.LocalDateTime;

/**
 * Flat live view of where a truck is, per its own device. Sibling of
 * {@link DriverLocationDto}, which reports the same thing from the driver's phone.
 */
public record TruckPositionDto(
        Integer truckId,
        String plateNumber,
        Integer jobId,
        String jobTitle,
        Double latitude,
        Double longitude,
        Double speedKph,
        Double heading,
        Integer odometerKm,
        Double fuelLevelPct,
        Boolean engineOn,
        String source,
        LocalDateTime recordedAt
) {
    /** Build from a persisted reading. Requires a transaction: truck/job are LAZY. */
    public static TruckPositionDto from(TruckTelemetry t) {
        return new TruckPositionDto(
                t.getTruck().getId(),
                t.getTruck().getPlateNumber(),
                t.getJob() != null ? t.getJob().getId() : null,
                t.getJob() != null ? t.getJob().getTitle() : null,
                t.getLatitude(),
                t.getLongitude(),
                t.getSpeedKph(),
                t.getHeading(),
                t.getOdometerKm(),
                t.getFuelLevelPct(),
                t.getEngineOn(),
                t.getSource(),
                t.getRecordedAt()
        );
    }
}
