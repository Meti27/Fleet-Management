package com.fleet.backend.controller;

import com.fleet.backend.dto.JobRequest;
import com.fleet.backend.entity.Driver;
import com.fleet.backend.entity.Job;
import com.fleet.backend.entity.JobStatusHistory;
import com.fleet.backend.entity.Truck;
import com.fleet.backend.repository.DriverRepository;
import com.fleet.backend.repository.JobRepository;
import com.fleet.backend.repository.JobStatusHistoryRepository;
import com.fleet.backend.repository.TruckRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/jobs")
@CrossOrigin(origins = "*")
public class JobController {

    private final JobRepository jobRepository;
    private final DriverRepository driverRepository;
    private final TruckRepository truckRepository;
    private final JobStatusHistoryRepository historyRepository;
    //private final List<String> ACTIVE_STATUSES = List.of("OPEN", "ASSIGNED", "IN_PROGRESS");

    public JobController(JobRepository jobRepository,
                         DriverRepository driverRepository,
                         TruckRepository truckRepository,
                         JobStatusHistoryRepository historyRepository) {
        this.jobRepository = jobRepository;
        this.driverRepository = driverRepository;
        this.truckRepository = truckRepository;
        this.historyRepository = historyRepository;
    }

    private void validateNoConflicts(Integer driverId,
                                     Integer truckId,
                                     Integer jobId,
                                     LocalDateTime pickupTime,
                                     LocalDateTime dropoffTime) {

        if (pickupTime == null || dropoffTime == null) {
            // If there is no time range, we can't check conflicts
            return;
        }

        if (driverId != null) {
            var conflicts = jobRepository.findConflictingJobsForDriver(
                    driverId, jobId, pickupTime, dropoffTime
            );
            if (!conflicts.isEmpty()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Driver already has another job in this time range (job #" + conflicts.get(0).getId() + ")"
                );
            }
        }

        if (truckId != null) {
            var conflicts = jobRepository.findConflictingJobsForTruck(
                    truckId, jobId, pickupTime, dropoffTime
            );
            if (!conflicts.isEmpty()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Truck already has another job in this time range (job #" + conflicts.get(0).getId() + ")"
                );
            }
        }
    }


    private void recordStatusChange(Job job, String fromStatus, String toStatus){
        // Don't record if no real change
        if (toStatus == null || (fromStatus != null && fromStatus.equals(toStatus))) {
            return;
        }

        JobStatusHistory jobStatusHistory = JobStatusHistory.builder()
                .job(job)
                .fromStatus(fromStatus)
                .toStatus(toStatus)
                .build();

        historyRepository.save(jobStatusHistory);
    }

    @GetMapping
    public List<Job> getAllJobs() {
        return jobRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Job> getJobById(@PathVariable Integer id) {
        return jobRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Job createJob(@RequestBody JobRequest request) {
        Job job = Job.builder()
                .title(request.getTitle())
                .pickupLocation(request.getPickupLocation())
                .dropoffLocation(request.getDropoffLocation())
                .pickupTime(request.getPickupTime())
                .dropoffTime(request.getDropoffTime())
                .priceEur(request.getPriceEur())
                .status(
                        request.getStatus() == null || request.getStatus().isBlank()
                                ? "OPEN"
                                : request.getStatus()
                )
                .build();

        // driver
        if (request.getDriverId() != null) {
            Driver driver = driverRepository.findById(request.getDriverId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Driver not found"));
            job.setDriver(driver);
        }

        // truck
        if (request.getTruckId() != null) {
            Truck truck = truckRepository.findById(request.getTruckId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Truck not found"));
            job.setTruck(truck);
        }

        // ✅ conflict check BEFORE save using job's current fields
        Integer driverId = job.getDriver() != null ? job.getDriver().getId() : null;
        Integer truckId = job.getTruck() != null ? job.getTruck().getId() : null;

        validateNoConflicts(
                driverId,
                truckId,
                null, // new job
                job.getPickupTime(),
                job.getDropoffTime()
        );

        Job saved = jobRepository.save(job);
        recordStatusChange(saved, null, saved.getStatus());
        return saved;
    }

    @PutMapping("/{id}")
    public ResponseEntity<Job> updateJob(@PathVariable Integer id, @RequestBody JobRequest request) {
        return jobRepository.findById(id)
                .map(existing -> {

                    String oldStatus = existing.getStatus();

                    // basic fields
                    existing.setTitle(request.getTitle());
                    existing.setPickupLocation(request.getPickupLocation());
                    existing.setDropoffLocation(request.getDropoffLocation());
                    existing.setPickupTime(request.getPickupTime());
                    existing.setDropoffTime(request.getDropoffTime());
                    existing.setPriceEur(request.getPriceEur());

                    // status
                    if (request.getStatus() != null) {
                        existing.setStatus(request.getStatus());
                    }

                    // driver
                    if (request.getDriverId() != null) {
                        Driver driver = driverRepository.findById(request.getDriverId())
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Driver not found"));
                        existing.setDriver(driver);
                    } else {
                        existing.setDriver(null);
                    }

                    // truck
                    if (request.getTruckId() != null) {
                        Truck truck = truckRepository.findById(request.getTruckId())
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Truck not found"));
                        existing.setTruck(truck);
                    } else {
                        existing.setTruck(null);
                    }

                    // ✅ conflict check AFTER applying all changes
                    Integer driverId = existing.getDriver() != null ? existing.getDriver().getId() : null;
                    Integer truckId = existing.getTruck() != null ? existing.getTruck().getId() : null;

                    validateNoConflicts(
                            driverId,
                            truckId,
                            existing.getId(),
                            existing.getPickupTime(),
                            existing.getDropoffTime()
                    );

                    Job saved = jobRepository.save(existing);

                    recordStatusChange(saved, oldStatus, saved.getStatus());

                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Job> updateStatus(@PathVariable Integer id,
                                            @RequestParam String status) {
        return jobRepository.findById(id)
                .map(existing -> {
                    String oldStatus = existing.getStatus();
                    existing.setStatus(status);
                    Job saved = jobRepository.save(existing);
                    recordStatusChange(saved, oldStatus, status);
                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteJob(@PathVariable Integer id){
        if(!jobRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        jobRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }


    @GetMapping("/{id}/history")
    public ResponseEntity<List<JobStatusHistory>> getJobHistory(@PathVariable Integer id) {
        return jobRepository.findById(id)
                .map(job -> {
                    List<JobStatusHistory> history = historyRepository.findByJob_IdOrderByChangedAtAsc(id);
                    return ResponseEntity.ok(history);
                })
                .orElse(ResponseEntity.notFound().build());
    }

}
