package com.fleet.backend.service;

import com.fleet.backend.entity.Driver;
import com.fleet.backend.entity.Job;
import com.fleet.backend.entity.Notification;
import com.fleet.backend.repository.NotificationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * In-app notifications (Phase 2). Stored and polled by the driver app; background
 * push is Phase 4.
 */
@Service
public class NotificationService {

    private final NotificationRepository notifications;

    public NotificationService(NotificationRepository notifications) {
        this.notifications = notifications;
    }

    /** Record that {@code job} was assigned to {@code driver}. No-op if the driver
     *  has no linked login account. Call inside the job's transaction. */
    public void notifyJobAssigned(Driver driver, Job job) {
        if (driver == null || driver.getUser() == null) {
            return;
        }
        notifications.save(Notification.builder()
                .user(driver.getUser())
                .type("JOB_ASSIGNED")
                .jobId(job.getId())
                .message("New job assigned: " + job.getTitle())
                .read(false)
                .build());
    }

    public List<Notification> listForUser(Integer userId) {
        return notifications.findByUser_IdOrderByCreatedAtDesc(userId);
    }

    public long unreadCount(Integer userId) {
        return notifications.countByUser_IdAndReadFalse(userId);
    }

    @Transactional
    public void markRead(Integer notificationId, Integer userId) {
        Notification n = notifications.findById(notificationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));
        if (!n.getUser().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your notification");
        }
        n.setRead(true);
        notifications.save(n);
    }

    @Transactional
    public void markAllRead(Integer userId) {
        List<Notification> all = notifications.findByUser_IdOrderByCreatedAtDesc(userId);
        all.forEach(n -> n.setRead(true));
        notifications.saveAll(all);
    }
}
