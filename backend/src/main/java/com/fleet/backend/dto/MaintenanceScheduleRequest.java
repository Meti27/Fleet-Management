package com.fleet.backend.dto;

import java.time.LocalDateTime;

public record MaintenanceScheduleRequest(
        String type,
        Integer intervalKm,
        Integer intervalMonths,
        Integer lastServiceKm,
        LocalDateTime lastServiceAt,
        Boolean active,
        String note
) {}
