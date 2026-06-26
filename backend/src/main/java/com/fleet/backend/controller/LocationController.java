package com.fleet.backend.controller;

import com.fleet.backend.dto.DriverLocationDto;
import com.fleet.backend.dto.TripFuelEstimate;
import com.fleet.backend.service.LocationService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Read side of live GPS tracking (Phase 3): the admin live map's initial snapshot.
 * Subsequent updates arrive over the WebSocket topic {@code /topic/locations}.
 * Any authenticated staff member may view fleet positions.
 */
@RestController
@RequestMapping("/api/locations")
@PreAuthorize("isAuthenticated()")
public class LocationController {

    private final LocationService locationService;

    public LocationController(LocationService locationService) {
        this.locationService = locationService;
    }

    @GetMapping("/latest")
    public List<DriverLocationDto> latest() {
        return locationService.latestLocations();
    }

    /** GPS distance + fuel/cost estimate for one job's trip. */
    @GetMapping("/job/{jobId}/trip")
    public TripFuelEstimate trip(@PathVariable Integer jobId) {
        return locationService.estimateTrip(jobId);
    }
}
