package com.fleet.backend.controller;

import com.fleet.backend.dto.DriverLocationDto;
import com.fleet.backend.dto.LocationPingRequest;
import com.fleet.backend.entity.Job;
import com.fleet.backend.entity.Notification;
import com.fleet.backend.service.DriverService;
import com.fleet.backend.service.LocationService;
import com.fleet.backend.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Driver-app API. Everything here is scoped to the logged-in driver and requires
 * the DRIVER role; ownership is enforced in {@link DriverService}.
 */
@RestController
@RequestMapping("/api/driver")
@PreAuthorize("hasRole('DRIVER')")
public class DriverJobController {

    private final DriverService driverService;
    private final NotificationService notificationService;
    private final LocationService locationService;

    public DriverJobController(DriverService driverService, NotificationService notificationService,
                               LocationService locationService) {
        this.driverService = driverService;
        this.notificationService = notificationService;
        this.locationService = locationService;
    }

    @GetMapping("/me/jobs")
    public List<Job> myJobs() {
        return driverService.myJobs();
    }

    @PostMapping("/jobs/{id}/start")
    public ResponseEntity<Job> start(@PathVariable Integer id) {
        return ResponseEntity.ok(driverService.startJob(id));
    }

    @PostMapping("/jobs/{id}/finish")
    public ResponseEntity<Job> finish(@PathVariable Integer id) {
        return ResponseEntity.ok(driverService.finishJob(id));
    }

    /** Report the driver's current GPS position; broadcast to the admin live map. */
    @PostMapping("/location")
    public ResponseEntity<DriverLocationDto> reportLocation(@RequestBody LocationPingRequest req) {
        return ResponseEntity.ok(locationService.record(driverService.currentDriver(), req));
    }

    @GetMapping("/me/notifications")
    public List<Notification> notifications() {
        return notificationService.listForUser(driverService.currentUser().getId());
    }

    @GetMapping("/me/notifications/unread-count")
    public Map<String, Long> unreadCount() {
        return Map.of("count", notificationService.unreadCount(driverService.currentUser().getId()));
    }

    @PostMapping("/notifications/{id}/read")
    public ResponseEntity<Void> markRead(@PathVariable Integer id) {
        notificationService.markRead(id, driverService.currentUser().getId());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/notifications/read-all")
    public ResponseEntity<Void> markAllRead() {
        notificationService.markAllRead(driverService.currentUser().getId());
        return ResponseEntity.ok().build();
    }
}
