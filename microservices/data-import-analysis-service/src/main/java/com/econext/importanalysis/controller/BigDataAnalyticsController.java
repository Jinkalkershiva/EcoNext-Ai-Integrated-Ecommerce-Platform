package com.econext.importanalysis.controller;

import com.econext.importanalysis.dto.ApiResponse;
import com.econext.importanalysis.dto.BigDataOverviewResponse;
import com.econext.importanalysis.dto.HdfsLakeMetricsResponse;
import com.econext.importanalysis.dto.SearchTrendsResponse;
import com.econext.importanalysis.service.BigDataAnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/analytics/big-data")
@RequiredArgsConstructor
@Tag(name = "Big Data & Hadoop Analytics", description = "Real-time streaming telemetry, Kafka throughput, HDFS Lake metrics, and Spark ML forecast")
public class BigDataAnalyticsController {

    private final BigDataAnalyticsService bigDataAnalyticsService;

    @GetMapping("/overview")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('DATA_ANALYSIS') or hasAuthority('ROLE_STAFF')")
    @Operation(summary = "Get overall Big Data architecture telemetry: Kafka, HDFS, Spark pipelines and AI forecasting")
    public ResponseEntity<ApiResponse<BigDataOverviewResponse>> getBigDataOverview() {
        BigDataOverviewResponse response = bigDataAnalyticsService.getBigDataOverview();
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/search-trends")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('DATA_ANALYSIS') or hasAuthority('ROLE_STAFF')")
    @Operation(summary = "Get deep-dive search query analytics, zero-result terms, and conversion rates")
    public ResponseEntity<ApiResponse<SearchTrendsResponse>> getSearchTrends() {
        SearchTrendsResponse response = bigDataAnalyticsService.getSearchTrends();
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/hdfs-lake-metrics")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('DATA_ANALYSIS') or hasAuthority('ROLE_STAFF')")
    @Operation(summary = "Get HDFS Data Lake partition sizes, storage distribution, and Spark streaming job metrics")
    public ResponseEntity<ApiResponse<HdfsLakeMetricsResponse>> getHdfsLakeMetrics() {
        HdfsLakeMetricsResponse response = bigDataAnalyticsService.getHdfsLakeMetrics();
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
