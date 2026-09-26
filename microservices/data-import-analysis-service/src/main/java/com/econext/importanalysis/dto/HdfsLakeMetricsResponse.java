package com.econext.importanalysis.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HdfsLakeMetricsResponse {
    private String hdfsClusterUri;
    private String hdfsStatus; // HEALTHY, SYNCING, OFFLINE
    private Double totalCapacityGb;
    private Double usedCapacityGb;
    private Double lakeUsagePercentage;
    private Long totalFilesCount;
    private Long totalPartitionsCount;
    private List<LakeDirectoryMetric> directoryBreakdown;
    private List<SparkPipelineStatus> sparkPipelines;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class LakeDirectoryMetric {
        private String path;
        private String layer; // RAW, PROCESSED, ANALYTICS
        private String format; // JSON, PARQUET, DELTA
        private Long fileCount;
        private Double sizeMb;
        private String retentionPolicy;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SparkPipelineStatus {
        private String pipelineName;
        private String streamingMode; // STRUCTURED_STREAMING, BATCH_COMPACTION, DAILY_ANALYTICS
        private String status; // RUNNING, ACTIVE, COMPLETED, IDLE
        private Long processedRowsLastHour;
        private Double latencySeconds;
        private String lastCheckpointTime;
    }
}
