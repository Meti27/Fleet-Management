package com.fleet.backend.dto;

import java.time.LocalDateTime;

/**
 * Whether the vehicle's own telemetry backs up what the driver claimed about a job.
 *
 * <p>Computed on demand and never stored — the same approach {@code ReminderDto}
 * takes — so it always reflects the latest readings and there is no derived state
 * to keep in sync.</p>
 *
 * @param verdict NOT_STARTED | NO_DATA | VERIFIED | SUSPICIOUS
 * @param reason  plain-language explanation, shown straight to the office
 * @param distanceKm     path length actually covered
 * @param displacementKm how far the truck got from where it started — the figure that
 *                       separates a real trip from an idling vehicle with jittery GPS
 */
public record JobVerificationDto(
        Integer jobId,
        String jobTitle,
        String plateNumber,
        String driverName,
        String status,
        String verdict,
        String reason,
        Double distanceKm,
        Double displacementKm,
        Long runningMinutes,
        Integer readingCount,
        LocalDateTime startedAt,
        LocalDateTime finishedAt
) {
    public static final String NOT_STARTED = "NOT_STARTED";
    public static final String NO_DATA = "NO_DATA";
    public static final String VERIFIED = "VERIFIED";
    public static final String SUSPICIOUS = "SUSPICIOUS";
}
