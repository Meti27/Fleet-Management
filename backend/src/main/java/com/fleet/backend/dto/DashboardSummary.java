package com.fleet.backend.dto;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardSummar {

    private long totalDrivers;
    private long totalTrucks;
    private long totalJobs;


    private long activeJobs;
    private long completedJobs;
    private long cancelledJobs;

    private long availableDrivers;
    private long availableTrucks;

    private double totalRevenue;
    private double revenueLast30Days;


}
