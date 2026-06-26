package com.fleet.backend.dto;

import com.fleet.backend.entity.LocationPing;

import java.time.LocalDateTime;

/**
 * Flat live-map projection of a driver's current position. This is the only shape
 * crossing the wire — both the REST initial load ({@code GET /api/locations/latest})
 * and the WebSocket broadcast ({@code /topic/locations}) emit it.
 */
public record DriverLocationDto(
        Integer driverId,
        String driverName,
        Integer jobId,
        String jobTitle,
        Double latitude,
        Double longitude,
        Double speedKph,
        Double heading,
        LocalDateTime recordedAt
) {
    /** Build from a persisted ping. Assumes a transactional context if the LAZY
     *  driver/job relations are dereferenced. */
    public static DriverLocationDto from(LocationPing p) {
        return new DriverLocationDto(
                p.getDriver().getId(),
                p.getDriver().getName(),
                p.getJob() != null ? p.getJob().getId() : null,
                p.getJob() != null ? p.getJob().getTitle() : null,
                p.getLatitude(),
                p.getLongitude(),
                p.getSpeedKph(),
                p.getHeading(),
                p.getRecordedAt()
        );
    }
}
