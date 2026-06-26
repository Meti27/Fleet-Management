package com.fleet.backend.dto;

import java.time.LocalDate;

/**
 * A single fleet alert surfaced on the admin dashboard.
 *
 * @param category MAINTENANCE | DOCUMENT
 * @param status   OVERDUE | DUE_SOON
 * @param dueInKm  kilometres until due (maintenance, km-based); negative if overdue, null if N/A
 * @param dueInDays days until due; negative if overdue, null if N/A
 */
public record ReminderDto(
        Integer truckId,
        String plateNumber,
        String category,
        String type,
        String status,
        Integer dueInKm,
        Long dueInDays,
        LocalDate dueDate,
        String message
) {}
