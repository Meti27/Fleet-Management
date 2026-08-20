package com.fleet.backend.service;

import com.fleet.backend.entity.AppUser;
import com.fleet.backend.entity.Driver;
import com.fleet.backend.entity.Job;
import com.fleet.backend.entity.Truck;
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

    /**
     * Start a job. Requires the token behind the QR sticker in the assigned truck's
     * cab: the driver's login establishes <em>who</em> they are, the scan proves they
     * are <em>at the vehicle</em>. Only start is gated — pause, resume and finish are
     * plain taps.
     */
    public Job startJob(Integer jobId, String scannedToken) {
        Job job = ownedJob(jobId);
        requireTruckPresence(job, scannedToken);
        return jobService.updateStatus(jobId, "IN_PROGRESS");
    }

    public Job pauseJob(Integer jobId) {
        ownedJob(jobId);
        return jobService.updateStatus(jobId, "PAUSED");
    }

    public Job resumeJob(Integer jobId) {
        ownedJob(jobId);
        return jobService.updateStatus(jobId, "IN_PROGRESS");
    }

    public Job finishJob(Integer jobId) {
        ownedJob(jobId);
        return jobService.updateStatus(jobId, "DONE");
    }

    /**
     * Verify the scanned QR belongs to the truck this job is assigned to.
     * Tolerates the token arriving either bare or as the full URL encoded in the
     * QR ({@code https://host/t/<token>}), so a client that forwards the raw scan
     * still works.
     */
    private void requireTruckPresence(Job job, String scannedToken) {
        String token = normalizeToken(scannedToken);
        if (token.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Scan the QR code in the truck's cab to start this job");
        }
        Truck truck = job.getTruck();
        if (truck == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Job #" + job.getId() + " has no truck assigned yet — ask dispatch to assign one");
        }
        if (!token.equals(truck.getQrToken())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "That QR belongs to a different truck — job #" + job.getId()
                            + " is assigned to " + truck.getPlateNumber());
        }
    }

    /** Accept a bare token or the last path segment of the QR's URL. */
    private static String normalizeToken(String raw) {
        if (raw == null) return "";
        String v = raw.trim();
        int slash = v.lastIndexOf('/');
        if (slash >= 0) v = v.substring(slash + 1);
        return v.trim();
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
