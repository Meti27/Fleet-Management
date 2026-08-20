package com.fleet.backend.service;

import com.fleet.backend.dto.JobVerificationDto;
import com.fleet.backend.entity.Job;
import com.fleet.backend.entity.JobStatusHistory;
import com.fleet.backend.entity.TruckTelemetry;
import com.fleet.backend.repository.JobRepository;
import com.fleet.backend.repository.JobStatusHistoryRepository;
import com.fleet.backend.repository.TruckTelemetryRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import static com.fleet.backend.dto.JobVerificationDto.NOT_STARTED;
import static com.fleet.backend.dto.JobVerificationDto.NO_DATA;
import static com.fleet.backend.dto.JobVerificationDto.SUSPICIOUS;
import static com.fleet.backend.dto.JobVerificationDto.VERIFIED;

/**
 * Cross-checks what a driver claimed against what the truck's own device reported.
 *
 * <p>This is the answer to the client's core question — "is the driver actually doing
 * the job?" — and it works because the two sources are independent: the driver
 * controls the job status, the vehicle controls the telemetry. A job marked underway
 * by a truck that never left its parking spot is the case worth surfacing.</p>
 *
 * <p>Verdicts are computed on demand and never stored, mirroring
 * {@link MaintenanceReminderService}. Reads run in a read-only transaction so the
 * LAZY truck/driver relations resolve while the DTOs are built.</p>
 */
@Service
public class TripVerificationService {

    /** How long a job must have been running before "it hasn't moved" means anything. */
    private static final long STATIONARY_GRACE_MINUTES = 20;
    /** Below this displacement the vehicle has not meaningfully left where it started. */
    private static final double MIN_DISPLACEMENT_KM = 1.0;
    /** Movement beyond this during a pause suggests the pause is not real. */
    private static final double PAUSED_MOVE_KM = 2.0;

    private static final List<String> STARTED_STATUSES = List.of("IN_PROGRESS", "PAUSED", "DONE");
    /** How far back a completed job stays worth flagging. */
    private static final int RECENT_DAYS = 7;

    private final JobRepository jobs;
    private final JobStatusHistoryRepository history;
    private final TruckTelemetryRepository telemetry;

    public TripVerificationService(JobRepository jobs,
                                   JobStatusHistoryRepository history,
                                   TruckTelemetryRepository telemetry) {
        this.jobs = jobs;
        this.history = history;
        this.telemetry = telemetry;
    }

    @Transactional(readOnly = true)
    public JobVerificationDto verify(Integer jobId) {
        Job job = jobs.findById(jobId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found"));
        return verify(job);
    }

    /**
     * Every started job whose telemetry does not back up the claim, most recent first.
     * Drives the dashboard's alert panel.
     *
     * <p>Verification is per-job, so this is a query per job — fine at demo scale
     * (tens of jobs). Worth batching if the fleet grows into the thousands.</p>
     */
    @Transactional(readOnly = true)
    public List<JobVerificationDto> flagged(int limit) {
        List<JobVerificationDto> out = new ArrayList<>();
        LocalDateTime cutoff = LocalDateTime.now().minusDays(RECENT_DAYS);

        for (Job job : jobs.findAll()) {
            if (job.getStatus() == null || !STARTED_STATUSES.contains(job.getStatus())) continue;
            // Only surface work the office can still act on. Historical jobs that
            // predate the trackers would otherwise bury today's alerts under a wall
            // of "no data" for trips nobody can investigate any more.
            boolean running = !"DONE".equals(job.getStatus());
            boolean recent = job.getDropoffTime() != null && job.getDropoffTime().isAfter(cutoff);
            if (!running && !recent) continue;

            JobVerificationDto v = verify(job);
            if (SUSPICIOUS.equals(v.verdict()) || NO_DATA.equals(v.verdict())) {
                out.add(v);
            }
        }
        // Suspicious ahead of merely-unmonitored, then most recently started first.
        out.sort(Comparator
                .comparingInt((JobVerificationDto v) -> SUSPICIOUS.equals(v.verdict()) ? 0 : 1)
                .thenComparing(v -> v.startedAt() == null ? LocalDateTime.MIN : v.startedAt(),
                        Comparator.reverseOrder()));
        return out.size() > limit ? out.subList(0, limit) : out;
    }

    // ---------------------------------------------------------------- internals

    private JobVerificationDto verify(Job job) {
        List<JobStatusHistory> timeline = history.findByJob_IdOrderByChangedAtAsc(job.getId());
        LocalDateTime startedAt = firstTransitionTo(timeline, "IN_PROGRESS");
        LocalDateTime finishedAt = firstTransitionTo(timeline, "DONE");

        // Jobs bulk-inserted by the demo seeder bypass JobService and so carry no
        // status history. Fall back to the planned times, otherwise a job that is
        // plainly running would report as never started.
        if (startedAt == null && job.getStatus() != null && STARTED_STATUSES.contains(job.getStatus())) {
            startedAt = job.getPickupTime();
        }
        if (finishedAt == null && "DONE".equals(job.getStatus())) {
            finishedAt = job.getDropoffTime();
        }

        if (startedAt == null) {
            return build(job, NOT_STARTED, "Job has not been started yet",
                    null, null, null, 0, null, null);
        }

        List<TruckTelemetry> track = telemetry.findByJob_IdOrderByRecordedAtAsc(job.getId());
        long runningMinutes = Duration.between(
                startedAt, finishedAt != null ? finishedAt : LocalDateTime.now()).toMinutes();

        if (track.isEmpty()) {
            return build(job, NO_DATA,
                    "No telemetry from this truck for the job — device offline or not fitted",
                    null, null, runningMinutes, 0, startedAt, finishedAt);
        }

        double distanceKm = TelemetryService.distanceKm(track);
        double displacementKm = TelemetryService.displacementKm(track);

        // 1. Finished, but the vehicle never actually left.
        if (finishedAt != null && displacementKm < MIN_DISPLACEMENT_KM) {
            return build(job, SUSPICIOUS,
                    String.format("Marked done but the truck never left the area (moved %.1f km)", displacementKm),
                    distanceKm, displacementKm, runningMinutes, track.size(), startedAt, finishedAt);
        }

        // 2. Claimed underway for a meaningful stretch, still parked.
        if (finishedAt == null
                && runningMinutes >= STATIONARY_GRACE_MINUTES
                && displacementKm < MIN_DISPLACEMENT_KM) {
            return build(job, SUSPICIOUS,
                    String.format("Running for %d min but the truck has not moved (%.1f km)",
                            runningMinutes, displacementKm),
                    distanceKm, displacementKm, runningMinutes, track.size(), startedAt, finishedAt);
        }

        // 3. Driving during a declared pause.
        double movedWhilePaused = maxMovementDuringPauses(timeline, track);
        if (movedWhilePaused > PAUSED_MOVE_KM) {
            return build(job, SUSPICIOUS,
                    String.format("Truck moved %.1f km while the job was paused", movedWhilePaused),
                    distanceKm, displacementKm, runningMinutes, track.size(), startedAt, finishedAt);
        }

        return build(job, VERIFIED,
                String.format("Telemetry consistent with the trip (%.1f km covered)", distanceKm),
                distanceKm, displacementKm, runningMinutes, track.size(), startedAt, finishedAt);
    }

    /**
     * Largest displacement observed inside any PAUSED window. Each pause runs from
     * the transition into PAUSED until the next transition out of it.
     */
    private double maxMovementDuringPauses(List<JobStatusHistory> timeline, List<TruckTelemetry> track) {
        double worst = 0;
        for (int i = 0; i < timeline.size(); i++) {
            if (!"PAUSED".equals(timeline.get(i).getToStatus())) continue;
            LocalDateTime from = timeline.get(i).getChangedAt();
            LocalDateTime to = (i + 1 < timeline.size())
                    ? timeline.get(i + 1).getChangedAt()
                    : LocalDateTime.now();
            List<TruckTelemetry> window = track.stream()
                    .filter(t -> !t.getRecordedAt().isBefore(from) && !t.getRecordedAt().isAfter(to))
                    .toList();
            worst = Math.max(worst, TelemetryService.displacementKm(window));
        }
        return worst;
    }

    private static LocalDateTime firstTransitionTo(List<JobStatusHistory> timeline, String status) {
        return timeline.stream()
                .filter(h -> status.equals(h.getToStatus()))
                .map(JobStatusHistory::getChangedAt)
                .findFirst()
                .orElse(null);
    }

    private static JobVerificationDto build(Job job, String verdict, String reason,
                                            Double distanceKm, Double displacementKm,
                                            Long runningMinutes, int readings,
                                            LocalDateTime startedAt, LocalDateTime finishedAt) {
        return new JobVerificationDto(
                job.getId(),
                job.getTitle(),
                job.getTruck() != null ? job.getTruck().getPlateNumber() : null,
                job.getDriver() != null ? job.getDriver().getName() : null,
                job.getStatus(),
                verdict,
                reason,
                distanceKm,
                displacementKm,
                runningMinutes,
                readings,
                startedAt,
                finishedAt);
    }
}
