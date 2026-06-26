package com.fleet.backend.service;

import com.fleet.backend.entity.AppUser;
import com.fleet.backend.entity.Driver;
import com.fleet.backend.entity.Job;
import com.fleet.backend.repository.DriverRepository;
import com.fleet.backend.repository.JobRepository;
import com.fleet.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * Driver-app domain operations, scoped to the currently authenticated driver.
 * Resolves the {@link Driver} behind the logged-in {@link AppUser} and enforces
 * that drivers only touch their own jobs.
 */
@Service
public class DriverService {

    private final UserRepository users;
    private final DriverRepository drivers;
    private final JobRepository jobs;
    private final JobService jobService;

    public DriverService(UserRepository users, DriverRepository drivers,
                         JobRepository jobs, JobService jobService) {
        this.users = users;
        this.drivers = drivers;
        this.jobs = jobs;
        this.jobService = jobService;
    }

    public AppUser currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
        return users.findByUsername(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    public Driver currentDriver() {
        AppUser me = currentUser();
        return drivers.findByUser_Id(me.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Not a driver account"));
    }

    public List<Job> myJobs() {
        return jobs.findByDriver_IdOrderByPickupTimeAsc(currentDriver().getId());
    }

    public Job startJob(Integer jobId) {
        ownedJob(jobId);
        return jobService.updateStatus(jobId, "IN_PROGRESS");
    }

    public Job finishJob(Integer jobId) {
        ownedJob(jobId);
        return jobService.updateStatus(jobId, "DONE");
    }

    private Job ownedJob(Integer jobId) {
        Driver me = currentDriver();
        Job job = jobService.getJobById(jobId);
        if (job.getDriver() == null || !job.getDriver().getId().equals(me.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your job");
        }
        return job;
    }
}
