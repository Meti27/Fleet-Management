package com.fleet.backend.repository;

import com.fleet.backend.entity.JobStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface JobStatusHistoryRepository extends JpaRepository<JobStatusHistory, Integer> {

    List<JobStatusHistory> findByJob_IdOrderByChangedAtAsc(Integer jobId);
    void deleteByJob_Id(Integer jobId);
}
