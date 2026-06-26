package com.fleet.backend.controller;

import com.fleet.backend.dto.ReminderDto;
import com.fleet.backend.service.MaintenanceReminderService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Fleet-wide maintenance & document reminders for the admin dashboard. */
@RestController
@RequestMapping("/api/reminders")
public class ReminderController {

    private final MaintenanceReminderService reminderService;

    public ReminderController(MaintenanceReminderService reminderService) {
        this.reminderService = reminderService;
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping
    public List<ReminderDto> all() {
        return reminderService.allReminders();
    }
}
