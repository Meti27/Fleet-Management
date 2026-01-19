package com.fleet.backend.service;

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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class JobServiceImpl implements JobService {

    private final JobRepository jobRepository;
    private final DriverRepository driverRepository;
    private final TruckRepository truckRepository;
    private final JobStatusHistoryRepository historyRepository;

    // Decide what statuses count as "active" for conflict checks
    private static final List<String> ACTIVE_STATUSES = List.of("OPEN", "ASSIGNED", "IN_PROGRESS");

    public JobServiceImpl(JobRepository jobRepository,
                          DriverRepository driverRepository,
                          TruckRepository truckRepository,
                          JobStatusHistoryRepository historyRepository) {
        this.jobRepository = jobRepository;
        this.driverRepository = driverRepository;
        this.truckRepository = truckRepository;
        this.historyRepository = historyRepository;
    }

    @Override
    public List<Job> getAllJobs() {
        return jobRepository.findAll();
    }

    @Override
    public Job getJobById(Integer id) {
        return jobRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found"));
    }

    // ✅ Transaction ensures: job save + history save succeed together or rollback together
    @Override
    @Transactional
    public Job createJob(JobRequest request) {

        Job job = Job.builder()
                .title(request.getTitle())
                .pickupLocation(request.getPickupLocation())
                .dropoffLocation(request.getDropoffLocation())
                .pickupTime(request.getPickupTime())
                .dropoffTime(request.getDropoffTime())
                .priceEur(request.getPriceEur())
                .status((request.getStatus() == null || request.getStatus().isBlank()) ? "OPEN" : request.getStatus())
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

        // conflict check before saving
        Integer driverId = job.getDriver() != null ? job.getDriver().getId() : null;
        Integer truckId = job.getTruck() != null ? job.getTruck().getId() : null;

        validateNoConflicts(driverId, truckId, null, job.getPickupTime(), job.getDropoffTime());

        Job saved = jobRepository.save(job);

        // history record
        recordStatusChange(saved, null, saved.getStatus());

        return saved;
    }

    @Override
    @Transactional
    public Job updateJob(Integer id, JobRequest request) {
        Job existing = getJobById(id);

        String oldStatus = existing.getStatus();

        // basic fields
        existing.setTitle(request.getTitle());
        existing.setPickupLocation(request.getPickupLocation());
        existing.setDropoffLocation(request.getDropoffLocation());
        existing.setPickupTime(request.getPickupTime());
        existing.setDropoffTime(request.getDropoffTime());
        existing.setPriceEur(request.getPriceEur());

        // status (only update if provided)
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

        // conflict check after all changes applied
        Integer driverId = existing.getDriver() != null ? existing.getDriver().getId() : null;
        Integer truckId = existing.getTruck() != null ? existing.getTruck().getId() : null;

        validateNoConflicts(driverId, truckId, existing.getId(), existing.getPickupTime(), existing.getDropoffTime());

        Job saved = jobRepository.save(existing);

        recordStatusChange(saved, oldStatus, saved.getStatus());

        return saved;
    }

    @Override
    @Transactional
    public Job updateStatus(Integer id, String status) {
        Job job = getJobById(id);

        String oldStatus = job.getStatus();
        job.setStatus(status);

        Job saved = jobRepository.save(job);
        recordStatusChange(saved, oldStatus, status);

        return saved;
    }

    @Override
    @Transactional
    public void deleteJob(Integer id) {
        if (!jobRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found");
        }
        // optional: cleanup history first (your DB might allow cascade, but this is safe)
        historyRepository.deleteByJob_Id(id);
        jobRepository.deleteById(id);
    }

    @Override
    public List<JobStatusHistory> getJobHistory(Integer jobId) {
        // ensure job exists
        getJobById(jobId);
        return historyRepository.findByJob_IdOrderByChangedAtAsc(jobId);
    }

    // ----------------------
    // Private helper methods
    // ----------------------

    private void validateNoConflicts(Integer driverId,
                                     Integer truckId,
                                     Integer jobId,
                                     LocalDateTime pickupTime,
                                     LocalDateTime dropoffTime) {

        if (pickupTime == null || dropoffTime == null) return;

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
                    truckId, jobId, ACTIVE_STATUSES, pickupTime, dropoffTime
            );
            if (!conflicts.isEmpty()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Truck already has another job in this time range (job #" + conflicts.get(0).getId() + ")"
                );
            }
        }
    }

    private void recordStatusChange(Job job, String fromStatus, String toStatus) {
        if (toStatus == null || (fromStatus != null && fromStatus.equals(toStatus))) return;

        JobStatusHistory history = JobStatusHistory.builder()
                .job(job)
                .fromStatus(fromStatus)
                .toStatus(toStatus)
                .build();

        historyRepository.save(history);
    }
}
