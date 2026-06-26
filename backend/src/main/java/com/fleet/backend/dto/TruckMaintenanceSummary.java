package com.fleet.backend.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Aggregated maintenance/cost snapshot for a single truck, shown in the truck
 * detail header.
 */
public record TruckMaintenanceSummary(
        Integer truckId,
        String plateNumber,
        Integer currentOdometerKm,
        BigDecimal totalFuelCost,
        BigDecimal totalMaintenanceCost,
        Double avgFuelEfficiencyL100km,
        long openReminders,
        LocalDateTime lastFuelAt,
        LocalDateTime lastMaintenanceAt
) {}
