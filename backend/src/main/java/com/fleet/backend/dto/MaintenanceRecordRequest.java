package com.fleet.backend.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record MaintenanceRecordRequest(
        String type,
        LocalDateTime performedAt,
        Integer odometerKm,
        BigDecimal costEur,
        String vendor,
        String notes
) {}
