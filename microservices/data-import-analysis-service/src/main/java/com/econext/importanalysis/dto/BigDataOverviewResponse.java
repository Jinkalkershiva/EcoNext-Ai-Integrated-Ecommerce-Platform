package com.econext.importanalysis.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BigDataOverviewResponse {
    private String kafkaClusterStatus; // CONNECTED, DEGRADED, OFFLINE
    private String kafkaBootstrapServers;
    private Long activeDataSourcesCount;
    private Long totalEventsProcessed24h;
    private Double currentIngestionThroughputPerSec;
    private Double lakeStorageUsedMb;
    private Integer activeSparkStreamingJobs;
    private List<LiveDataSourceDto> sources;
    private Map<String, Long> eventsPerTopic;
    private List<ThroughputHistoryPoint> throughputTrend;
    private List<DemandForecastingInsight> aiForecastingInsights;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ThroughputHistoryPoint {
        private String timestamp;
        private Double eventsPerSec;
        private Double bytesPerSec;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DemandForecastingInsight {
        private String categoryName;
        private Double predictedGrowthPercentage;
        private String sustainabilityLift;
        private String recommendedAction;
        private Double confidenceScore;
    }
}
