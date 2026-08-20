package com.fleet.backend.controller;

import com.fleet.backend.dto.JobRequest;
import com.fleet.backend.dto.JobVerificationDto;
import com.fleet.backend.entity.Job;
import com.fleet.backend.entity.JobStatusHistory;
import com.fleet.backend.service.JobService;
import com.fleet.backend.service.TripVerificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.List;

@RestController
@RequestMapping("/api/jobs")
public class JobController {

    private final JobService jobService;
    private final TripVerificationService verificationService;

    public JobController(JobService jobService, TripVerificationService verificationService) {
        this.jobService = jobService;
        this.verificationService = verificationService;
    }
    @PreAuthorize("isAuthenticated()")
    @GetMapping
    public List<Job> getAllJobs() {
        return jobService.getAllJobs();
    }
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{id}")
    public ResponseEntity<Job> getJobById(@PathVariable Integer id) {
        return ResponseEntity.ok(jobService.getJobById(id));
    }
    @PreAuthorize("hasAnyRole('ADMIN','DISPATCHER')")
    @PostMapping
    public ResponseEntity<Job> createJob(@RequestBody JobRequest request) {
        return ResponseEntity.ok(jobService.createJob(request));
    }
    @PreAuthorize("hasAnyRole('ADMIN','DISPATCHER')")
    @PutMapping("/{id}")
    public ResponseEntity<Job> updateJob(@PathVariable Integer id, @RequestBody JobRequest request) {
        return ResponseEntity.ok(jobService.updateJob(id, request));
    }
    @PreAuthorize("hasAnyRole('ADMIN','DISPATCHER')")
    @PatchMapping("/{id}/status")
    public ResponseEntity<Job> updateStatus(@PathVariable Integer id,
                                            @RequestParam String status) {
        return ResponseEntity.ok(jobService.updateStatus(id, status));
    }
    @PreAuthorize("hasAnyRole('ADMIN','DISPATCHER')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteJob(@PathVariable Integer id) {
        jobService.deleteJob(id);
        return ResponseEntity.ok().build();
    }
    /** Jobs whose telemetry contradicts (or can't corroborate) the driver's claim. */
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/flagged")
    public List<JobVerificationDto> flagged(@RequestParam(defaultValue = "20") int limit) {
        return verificationService.flagged(limit);
    }

    /** Does the truck's own telemetry back up what the driver claimed for this job? */
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{id}/verification")
    public JobVerificationDto verification(@PathVariable Integer id) {
        return verificationService.verify(id);
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{id}/history")
    public ResponseEntity<List<JobStatusHistory>> getJobHistory(@PathVariable Integer id) {
        return ResponseEntity.ok(jobService.getJobHistory(id));
    }
}
