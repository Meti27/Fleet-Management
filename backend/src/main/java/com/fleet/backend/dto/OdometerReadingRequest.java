package com.fleet.backend.dto;

import java.time.LocalDateTime;

public record OdometerReadingRequest(
        Integer readingKm,
        LocalDateTime recordedAt,
        String note
) {}
