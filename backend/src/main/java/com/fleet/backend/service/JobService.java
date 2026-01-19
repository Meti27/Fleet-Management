package com.fleet.backend.service;

import com.fleet.backend.dto.JobRequest;
import com.fleet.backend.entity.Job;
import com.fleet.backend.entity.JobStatusHistory;

import java.util.List;

public interface JobService {
    List<Job> getAllJobs();
    Job getJobById(Integer id);

    Job createJob(JobRequest request);
    Job updateJob(Integer id, JobRequest request);

    Job updateStatus(Integer id, String status);

    void deleteJob(Integer id);

    List<JobStatusHistory> getJobHistory(Integer jobId);
}
