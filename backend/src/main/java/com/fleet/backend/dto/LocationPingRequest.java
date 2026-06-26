package com.fleet.backend.dto;

/**
 * A GPS position posted by the driver app (Phase 3). {@code jobId} is optional —
 * the in-progress job the driver is running, when known. Speed/heading are
 * best-effort (may be null on devices that don't report them).
 */
public record LocationPingRequest(
        Double latitude,
        Double longitude,
        Double speedKph,
        Double heading,
        Integer jobId
) {}
