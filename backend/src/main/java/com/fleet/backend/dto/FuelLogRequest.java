package com.fleet.backend.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record FuelLogRequest(
        Integer driverId,
        LocalDateTime filledAt,
        BigDecimal liters,
        BigDecimal costEur,
        Integer odometerKm,
        Boolean fullTank,
        String station,
        String note
) {}
