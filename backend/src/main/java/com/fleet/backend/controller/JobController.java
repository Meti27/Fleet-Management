package com.fleet.backend.controller;

import com.fleet.backend.dto.JobRequest;
import com.fleet.backend.entity.Job;
import com.fleet.backend.entity.JobStatusHistory;
import com.fleet.backend.service.JobService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.List;

@RestController
@RequestMapping("/api/jobs")
@CrossOrigin(origins = "*")
public class JobController {

    private final JobService jobService;

    public JobController(JobService jobService) {
        this.jobService = jobService;
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
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{id}/history")
    public ResponseEntity<List<JobStatusHistory>> getJobHistory(@PathVariable Integer id) {
        return ResponseEntity.ok(jobService.getJobHistory(id));
    }
}
