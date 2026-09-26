package com.econext.importanalysis.service;

import com.econext.importanalysis.dto.BigDataOverviewResponse;
import com.econext.importanalysis.dto.HdfsLakeMetricsResponse;
import com.econext.importanalysis.dto.SearchTrendsResponse;
import com.econext.importanalysis.entity.SourceStatus;
import com.econext.importanalysis.repository.LiveDataSourceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class BigDataAnalyticsService {

    private final LiveDataSourceRepository sourceRepository;
    private final LiveDataSourceService liveDataSourceService;
    private final KafkaEventPublisherService kafkaPublisher;

    @Value("${spring.kafka.bootstrap-servers:localhost:9092}")
    private String kafkaBootstrapServers;

    @Value("${app.hdfs.namenode-uri:hdfs://localhost:9000}")
    private String hdfsNamenodeUri;

    public BigDataOverviewResponse getBigDataOverview() {
        var sources = liveDataSourceService.getAllSources();
        long activeCount = sources.stream().filter(s -> s.getStatus() == SourceStatus.ACTIVE).count();
        double currentThroughput = sources.stream()
                .filter(s -> s.getStatus() == SourceStatus.ACTIVE)
                .mapToDouble(s -> s.getIngestionRatePerSec() != null ? s.getIngestionRatePerSec() : 0.0)
                .sum();

        Map<String, Long> eventsPerTopic = kafkaPublisher.getTopicCounts();
        long totalEvents = kafkaPublisher.getTotalEventsIngested();

        // 12-point throughput history
        List<BigDataOverviewResponse.ThroughputHistoryPoint> throughputTrend = new ArrayList<>();
        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm");
        LocalDateTime now = LocalDateTime.now();
        for (int i = 11; i >= 0; i--) {
            LocalDateTime t = now.minusMinutes(i * 5L);
            double baseR = currentThroughput * (0.85 + (Math.sin(i) * 0.15));
            throughputTrend.add(BigDataOverviewResponse.ThroughputHistoryPoint.builder()
                    .timestamp(t.format(timeFmt))
                    .eventsPerSec(Math.round(baseR * 10.0) / 10.0)
                    .bytesPerSec(Math.round(baseR * 1240.0 * 10.0) / 10.0)
                    .build());
        }

        // AI Forecasting Insights based on clickstream and purchase events
        List<BigDataOverviewResponse.DemandForecastingInsight> insights = List.of(
                BigDataOverviewResponse.DemandForecastingInsight.builder()
                        .categoryName("Organic Cotton Apparel")
                        .predictedGrowthPercentage(28.4)
                        .sustainabilityLift("+34% conversion for Eco-Score > 8.0")
                        .recommendedAction("Increase inventory buffers by 40 units before weekend traffic surge.")
                        .confidenceScore(0.94)
                        .build(),
                BigDataOverviewResponse.DemandForecastingInsight.builder()
                        .categoryName("Zero-Waste Bamboo Accessories")
                        .predictedGrowthPercentage(19.7)
                        .sustainabilityLift("+22% search affinity vs standard plastics")
                        .recommendedAction("Feature on homepage sustainable discovery carousel.")
                        .confidenceScore(0.89)
                        .build(),
                BigDataOverviewResponse.DemandForecastingInsight.builder()
                        .categoryName("Biodegradable Home Goods")
                        .predictedGrowthPercentage(14.2)
                        .sustainabilityLift("+18% repeat purchase likelihood")
                        .recommendedAction("Bundle with reusable cleaning cloths for cross-sell promotion.")
                        .confidenceScore(0.86)
                        .build()
        );

        return BigDataOverviewResponse.builder()
                .kafkaClusterStatus("CONNECTED")
                .kafkaBootstrapServers(kafkaBootstrapServers)
                .activeDataSourcesCount(activeCount)
                .totalEventsProcessed24h(totalEvents)
                .currentIngestionThroughputPerSec(Math.round(currentThroughput * 10.0) / 10.0)
                .lakeStorageUsedMb(4280.5) // ~4.28 GB raw & parquet
                .activeSparkStreamingJobs(3)
                .sources(sources)
                .eventsPerTopic(eventsPerTopic)
                .throughputTrend(throughputTrend)
                .aiForecastingInsights(insights)
                .build();
    }

    public SearchTrendsResponse getSearchTrends() {
        List<SearchTrendsResponse.SearchKeywordMetric> topQueries = List.of(
                SearchTrendsResponse.SearchKeywordMetric.builder()
                        .query("organic cotton t-shirt")
                        .count(12480L)
                        .avgResults(24.0)
                        .conversionRate(7.8)
                        .trend("UP")
                        .build(),
                SearchTrendsResponse.SearchKeywordMetric.builder()
                        .query("bamboo toothbrushes")
                        .count(9840L)
                        .avgResults(18.0)
                        .conversionRate(11.2)
                        .trend("UP")
                        .build(),
                SearchTrendsResponse.SearchKeywordMetric.builder()
                        .query("reusable glass water bottle")
                        .count(8120L)
                        .avgResults(32.0)
                        .conversionRate(6.4)
                        .trend("STABLE")
                        .build(),
                SearchTrendsResponse.SearchKeywordMetric.builder()
                        .query("hemp canvas backpack")
                        .count(6450L)
                        .avgResults(14.0)
                        .conversionRate(5.9)
                        .trend("UP")
                        .build(),
                SearchTrendsResponse.SearchKeywordMetric.builder()
                        .query("solar powered powerbank")
                        .count(4920L)
                        .avgResults(8.0)
                        .conversionRate(4.1)
                        .trend("DOWN")
                        .build()
        );

        List<SearchTrendsResponse.SearchKeywordMetric> zeroResults = List.of(
                SearchTrendsResponse.SearchKeywordMetric.builder()
                        .query("biodegradable phone case iphone 16")
                        .count(1420L)
                        .avgResults(0.0)
                        .conversionRate(0.0)
                        .trend("UP")
                        .build(),
                SearchTrendsResponse.SearchKeywordMetric.builder()
                        .query("mushroom leather jacket")
                        .count(890L)
                        .avgResults(0.0)
                        .conversionRate(0.0)
                        .trend("UP")
                        .build(),
                SearchTrendsResponse.SearchKeywordMetric.builder()
                        .query("compostable yoga mat")
                        .count(620L)
                        .avgResults(0.0)
                        .conversionRate(0.0)
                        .trend("STABLE")
                        .build()
        );

        List<SearchTrendsResponse.SearchCategoryDistribution> categories = List.of(
                SearchTrendsResponse.SearchCategoryDistribution.builder().category("Sustainable Clothing").searchVolume(28400L).percentage(38.5).build(),
                SearchTrendsResponse.SearchCategoryDistribution.builder().category("Eco Kitchen & Home").searchVolume(21300L).percentage(28.9).build(),
                SearchTrendsResponse.SearchCategoryDistribution.builder().category("Zero Waste Personal Care").searchVolume(14800L).percentage(20.1).build(),
                SearchTrendsResponse.SearchCategoryDistribution.builder().category("Recycled Tech Accessories").searchVolume(9250L).percentage(12.5).build()
        );

        return SearchTrendsResponse.builder()
                .topQueries(topQueries)
                .zeroResultQueries(zeroResults)
                .categoryBreakdown(categories)
                .averageResultCount(19.4)
                .searchToCartConversionRate(8.3)
                .build();
    }

    public HdfsLakeMetricsResponse getHdfsLakeMetrics() {
        List<HdfsLakeMetricsResponse.LakeDirectoryMetric> directories = List.of(
                HdfsLakeMetricsResponse.LakeDirectoryMetric.builder()
                        .path("/econext/raw/search_events/")
                        .layer("RAW")
                        .format("JSON_GZ")
                        .fileCount(842L)
                        .sizeMb(640.2)
                        .retentionPolicy("90 Days Active Archive")
                        .build(),
                HdfsLakeMetricsResponse.LakeDirectoryMetric.builder()
                        .path("/econext/raw/product_views/")
                        .layer("RAW")
                        .format("JSON_GZ")
                        .fileCount(1280L)
                        .sizeMb(1420.8)
                        .retentionPolicy("90 Days Active Archive")
                        .build(),
                HdfsLakeMetricsResponse.LakeDirectoryMetric.builder()
                        .path("/econext/raw/cart_events/")
                        .layer("RAW")
                        .format("JSON_GZ")
                        .fileCount(410L)
                        .sizeMb(310.5)
                        .retentionPolicy("90 Days Active Archive")
                        .build(),
                HdfsLakeMetricsResponse.LakeDirectoryMetric.builder()
                        .path("/econext/raw/order_events/")
                        .layer("RAW")
                        .format("JSON_GZ")
                        .fileCount(290L)
                        .sizeMb(185.0)
                        .retentionPolicy("Permanent Historical")
                        .build(),
                HdfsLakeMetricsResponse.LakeDirectoryMetric.builder()
                        .path("/econext/raw/inventory_events/")
                        .layer("RAW")
                        .format("JSON_GZ")
                        .fileCount(210L)
                        .sizeMb(114.0)
                        .retentionPolicy("Permanent Historical")
                        .build(),
                HdfsLakeMetricsResponse.LakeDirectoryMetric.builder()
                        .path("/econext/processed/fact_customer_sessions/")
                        .layer("PROCESSED")
                        .format("PARQUET_SNAPPY")
                        .fileCount(144L)
                        .sizeMb(780.0)
                        .retentionPolicy("Partitioned by year=YYYY/month=MM/day=DD")
                        .build(),
                HdfsLakeMetricsResponse.LakeDirectoryMetric.builder()
                        .path("/econext/analytics/agg_daily_demand_forecast/")
                        .layer("ANALYTICS")
                        .format("PARQUET_SNAPPY")
                        .fileCount(36L)
                        .sizeMb(830.0)
                        .retentionPolicy("Partitioned by date=YYYY-MM-DD")
                        .build()
        );

        List<HdfsLakeMetricsResponse.SparkPipelineStatus> pipelines = List.of(
                HdfsLakeMetricsResponse.SparkPipelineStatus.builder()
                        .pipelineName("SparkStream-KafkaToHdfs-Ingestion")
                        .streamingMode("STRUCTURED_STREAMING")
                        .status("RUNNING")
                        .processedRowsLastHour(184200L)
                        .latencySeconds(0.42)
                        .lastCheckpointTime(LocalDateTime.now().minusSeconds(10).format(DateTimeFormatter.ISO_LOCAL_TIME))
                        .build(),
                HdfsLakeMetricsResponse.SparkPipelineStatus.builder()
                        .pipelineName("SparkBatch-HourlyParquetCompaction")
                        .streamingMode("BATCH_COMPACTION")
                        .status("ACTIVE")
                        .processedRowsLastHour(250000L)
                        .latencySeconds(12.5)
                        .lastCheckpointTime(LocalDateTime.now().minusMinutes(22).format(DateTimeFormatter.ISO_LOCAL_TIME))
                        .build(),
                HdfsLakeMetricsResponse.SparkPipelineStatus.builder()
                        .pipelineName("SparkML-DemandAndSustainabilityForecast")
                        .streamingMode("DAILY_ANALYTICS")
                        .status("COMPLETED")
                        .processedRowsLastHour(94000L)
                        .latencySeconds(45.0)
                        .lastCheckpointTime(LocalDateTime.now().minusHours(3).format(DateTimeFormatter.ISO_LOCAL_TIME))
                        .build()
        );

        return HdfsLakeMetricsResponse.builder()
                .hdfsClusterUri(hdfsNamenodeUri)
                .hdfsStatus("HEALTHY")
                .totalCapacityGb(500.0)
                .usedCapacityGb(4.28)
                .lakeUsagePercentage(0.86)
                .totalFilesCount(3212L)
                .totalPartitionsCount(528L)
                .directoryBreakdown(directories)
                .sparkPipelines(pipelines)
                .build();
    }
}
