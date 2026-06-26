package com.fleet.backend.dto;

/**
 * GPS-derived trip summary for one job (Phase 3 follow-up): distance covered from
 * the job's location pings, plus a fuel/cost estimate using the truck's rated
 * consumption. Fields are null when the inputs are missing (too few pings, no
 * rate set, or no fuel price history) — the caller renders "—".
 */
public record TripFuelEstimate(
        Integer jobId,
        Integer pointCount,
        Double distanceKm,
        Double avgSpeedKph,
        Long durationMinutes,
        Double rateL100km,
        Double estimatedLiters,
        Double estimatedCostEur
) {
    /** Trip with a known distance but no fuel estimate (no rate on the truck). */
    public static TripFuelEstimate distanceOnly(Integer jobId, int points, double distanceKm,
                                                Double avgSpeedKph, Long durationMinutes) {
        return new TripFuelEstimate(jobId, points, distanceKm, avgSpeedKph, durationMinutes,
                null, null, null);
    }
}
