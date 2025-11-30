package com.fleet.backend.controller;

import com.fleet.backend.dto.DashboardSummary;
import com.fleet.backend.entity.Job;
import com.fleet.backend.entity.Truck;
import com.fleet.backend.repository.DriverRepository;
import com.fleet.backend.repository.JobRepository;
import com.fleet.backend.repository.TruckRepository;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(origins = "*")
public class DashboardController {

    private final DriverRepository driverRepository;
    private final JobRepository jobRepository;
    private final TruckRepository truckRepository;

    public DashboardController(
            DriverRepository driverRepository,
            JobRepository jobRepository,
            TruckRepository truckRepository
    ){
        this.driverRepository = driverRepository;
        this.jobRepository = jobRepository;
        this.truckRepository = truckRepository;
    }

    @GetMapping("/summary")
    public DashboardSummary getSummary(){
        long totalDrivers = driverRepository.count();
        long totalTrucks = truckRepository.count();

        List<Job> jobs = jobRepository.findAll();
        long totalJobs = jobs.size();

        long activeJobs = jobs.stream()
                .filter(j -> hasStatus(j, "OPEN", "ASSIGNED", "IN_PROGRESS"))
                .count();
        long completedJobs = jobs.stream()
                .filter(j -> hasStatus(j, "DONE"))
                .count();

        long cancelledJobs = jobs.stream()
                .filter(j -> hasStatus(j, "CANCELLED"))
                .count();

        Set<Integer> busyDriverIds = jobs.stream()
                .filter(j -> hasStatus(j, "OPEN", "ASSIGNED", "IN_PROGRESS"))
                .filter(j -> j.getDriver() != null)
                .map(j -> j.getDriver().getId())
                .collect(Collectors.toSet());

        Set<Integer> busyTruckIds = jobs.stream()
                .filter(j -> hasStatus(j, "OPEN", "ASSIGNED", "IN_PROGRESS"))
                .filter(j -> j.getTruck() != null)
                .map(j -> j.getTruck().getId())
                .collect(Collectors.toSet());

        long availableDrivers = Math.max(0, totalDrivers - busyDriverIds.size());
        long availableTrucks = Math.max(0, totalTrucks - busyTruckIds.size());

        double totalRevenue = jobs.stream()
                .filter(j -> hasStatus(j, "DONE"))
                .map(Job::getPriceEur)
                .filter(Objects::nonNull)
                .mapToDouble(BigDecimal::doubleValue)
                .sum();

        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);

        double revenueLast30Days = jobs.stream()
                .filter(j -> hasStatus(j, "DONE"))
                .filter(j -> j.getDropoffTime() != null && j.getDropoffTime().isAfter(thirtyDaysAgo))
                .map(Job::getPriceEur)
                .filter(Objects::nonNull)
                .mapToDouble(BigDecimal::doubleValue)
                .sum();

        return DashboardSummary.builder()
                .totalDrivers(totalDrivers)
                .totalTrucks(totalTrucks)
                .totalJobs(totalJobs)
                .activeJobs(activeJobs)
                .completedJobs(completedJobs)
                .cancelledJobs(cancelledJobs)
                .availableDrivers(availableDrivers)
                .availableTrucks(availableTrucks)
                .totalRevenue(totalRevenue)
                .revenueLast30Days(revenueLast30Days)
                .build();
    }
    private boolean hasStatus(Job job, String... statuses) {
        if (job.getStatus() == null) return false;
        String s = job.getStatus().toUpperCase();
        for (String st : statuses) {
            if (s.equals(st)) return true;
        }
        return false;
    }

}
