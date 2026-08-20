package com.fleet.backend.util;

/**
 * Shared geo helpers. Extracted from {@code LocationService} when truck telemetry
 * arrived so both position sources (driver phone and vehicle device) measure
 * distance the same way — a discrepancy between the two would undermine the whole
 * point of cross-checking one against the other.
 */
public final class GeoUtils {

    private GeoUtils() {}

    /** Great-circle distance between two lat/lng points, in kilometres. */
    public static double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    public static double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
