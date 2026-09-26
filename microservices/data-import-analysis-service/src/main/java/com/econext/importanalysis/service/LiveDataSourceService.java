package com.econext.importanalysis.service;

import com.econext.importanalysis.dto.LiveDataSourceDto;
import com.econext.importanalysis.entity.DataSourceType;
import com.econext.importanalysis.entity.LiveDataSource;
import com.econext.importanalysis.entity.SourceStatus;
import com.econext.importanalysis.repository.LiveDataSourceRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class LiveDataSourceService {

    private final LiveDataSourceRepository repository;
    private final KafkaEventPublisherService kafkaEventPublisher;

    @PostConstruct
    @Transactional
    public void initDefaultDataSources() {
        if (repository.count() == 0) {
            log.info("Initializing EcoNext Big Data Live Ingestion Pipelines & Data Sources...");

            List<LiveDataSource> defaultSources = List.of(
                    LiveDataSource.builder()
                            .sourceName("User Search Clickstream Stream")
                            .sourceType(DataSourceType.KAFKA_TOPIC)
                            .targetTopic(KafkaEventPublisherService.TOPIC_SEARCH_EVENTS)
                            .status(SourceStatus.ACTIVE)
                            .ingestionRatePerSec(14.2)
                            .totalEventsIngested(48250L)
                            .hdfsSinkPath("/econext/raw/search_events/")
                            .schemaFormat("JSON_AVRO_COMPATIBLE")
                            .description("Live customer search queries, filter facets, and search result volume streams.")
                            .lastIngestedAt(LocalDateTime.now().minusSeconds(5))
                            .build(),

                    LiveDataSource.builder()
                            .sourceName("Product Catalog View Events")
                            .sourceType(DataSourceType.KAFKA_TOPIC)
                            .targetTopic(KafkaEventPublisherService.TOPIC_PRODUCT_VIEWS)
                            .status(SourceStatus.ACTIVE)
                            .ingestionRatePerSec(26.8)
                            .totalEventsIngested(67100L)
                            .hdfsSinkPath("/econext/raw/product_views/")
                            .schemaFormat("JSON_AVRO_COMPATIBLE")
                            .description("Real-time product detail impressions, sustainability card interactions, and dwell time.")
                            .lastIngestedAt(LocalDateTime.now().minusSeconds(2))
                            .build(),

                    LiveDataSource.builder()
                            .sourceName("Shopping Cart Telemetry Stream")
                            .sourceType(DataSourceType.APP_EVENT_BUS)
                            .targetTopic(KafkaEventPublisherService.TOPIC_CART_EVENTS)
                            .status(SourceStatus.ACTIVE)
                            .ingestionRatePerSec(8.5)
                            .totalEventsIngested(18940L)
                            .hdfsSinkPath("/econext/raw/cart_events/")
                            .schemaFormat("JSON_AVRO_COMPATIBLE")
                            .description("Item additions, removals, quantity updates, and abandoned cart trigger stream.")
                            .lastIngestedAt(LocalDateTime.now().minusSeconds(8))
                            .build(),

                    LiveDataSource.builder()
                            .sourceName("Order Fulfillment State Machine Stream")
                            .sourceType(DataSourceType.CDC_STREAM)
                            .targetTopic(KafkaEventPublisherService.TOPIC_ORDER_EVENTS)
                            .status(SourceStatus.ACTIVE)
                            .ingestionRatePerSec(3.2)
                            .totalEventsIngested(6820L)
                            .hdfsSinkPath("/econext/raw/order_events/")
                            .schemaFormat("JSON_AVRO_COMPATIBLE")
                            .description("Order creation, carrier assignment, stage progression, and SLA tracking events.")
                            .lastIngestedAt(LocalDateTime.now().minusSeconds(15))
                            .build(),

                    LiveDataSource.builder()
                            .sourceName("Inventory Delta & Reorder Event Stream")
                            .sourceType(DataSourceType.CDC_STREAM)
                            .targetTopic(KafkaEventPublisherService.TOPIC_INVENTORY_EVENTS)
                            .status(SourceStatus.ACTIVE)
                            .ingestionRatePerSec(2.1)
                            .totalEventsIngested(4710L)
                            .hdfsSinkPath("/econext/raw/inventory_events/")
                            .schemaFormat("JSON_AVRO_COMPATIBLE")
                            .description("Real-time stock decrements, low-stock threshold triggers, and bulk replenishment updates.")
                            .lastIngestedAt(LocalDateTime.now().minusSeconds(30))
                            .build(),

                    LiveDataSource.builder()
                            .sourceName("Supplier Sustainability Catalog REST Feed")
                            .sourceType(DataSourceType.REST_POLL)
                            .targetTopic("supplier-eco-feed")
                            .endpointUrl("https://supplier-gateway.econext.local/v1/eco-feed")
                            .status(SourceStatus.ACTIVE)
                            .ingestionRatePerSec(0.4)
                            .totalEventsIngested(1250L)
                            .hdfsSinkPath("/econext/raw/supplier_feeds/")
                            .schemaFormat("JSON_AVRO_COMPATIBLE")
                            .description("Periodic polling of external partner supplier material certifications and carbon index.")
                            .lastIngestedAt(LocalDateTime.now().minusMinutes(2))
                            .build()
            );

            repository.saveAll(defaultSources);
            log.info("Registered {} default Big Data Ingestion Pipelines.", defaultSources.size());
        }
    }

    @Transactional(readOnly = true)
    public List<LiveDataSourceDto> getAllSources() {
        return repository.findAll().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public LiveDataSourceDto getSourceById(Long id) {
        LiveDataSource source = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Live Data Source not found with ID: " + id));
        return mapToDto(source);
    }

    @Transactional
    public LiveDataSourceDto createSource(LiveDataSourceDto dto) {
        LiveDataSource source = LiveDataSource.builder()
                .sourceName(dto.getSourceName())
                .sourceType(dto.getSourceType() != null ? dto.getSourceType() : DataSourceType.KAFKA_TOPIC)
                .targetTopic(dto.getTargetTopic())
                .endpointUrl(dto.getEndpointUrl())
                .status(dto.getStatus() != null ? dto.getStatus() : SourceStatus.ACTIVE)
                .ingestionRatePerSec(dto.getIngestionRatePerSec() != null ? dto.getIngestionRatePerSec() : 1.0)
                .totalEventsIngested(0L)
                .hdfsSinkPath(dto.getHdfsSinkPath() != null ? dto.getHdfsSinkPath() : "/econext/raw/" + dto.getTargetTopic() + "/")
                .schemaFormat(dto.getSchemaFormat() != null ? dto.getSchemaFormat() : "JSON_EVENT")
                .description(dto.getDescription())
                .build();

        LiveDataSource saved = repository.save(source);
        return mapToDto(saved);
    }

    @Transactional
    public LiveDataSourceDto toggleStatus(Long id) {
        LiveDataSource source = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Live Data Source not found with ID: " + id));

        if (source.getStatus() == SourceStatus.ACTIVE) {
            source.setStatus(SourceStatus.PAUSED);
            source.setIngestionRatePerSec(0.0);
        } else {
            source.setStatus(SourceStatus.ACTIVE);
            source.setIngestionRatePerSec(8.0);
            source.setLastIngestedAt(LocalDateTime.now());
        }

        return mapToDto(repository.save(source));
    }

    @Transactional
    public Map<String, Object> dispatchTestEvent(Long id) {
        LiveDataSource source = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Live Data Source not found with ID: " + id));

        Map<String, Object> testPayload = new HashMap<>();
        testPayload.put("sourceName", source.getSourceName());
        testPayload.put("testEvent", true);
        testPayload.put("dispatchedBy", "EcoNext Big Data Test Engine");
        testPayload.put("metricTimestamp", System.currentTimeMillis());

        kafkaEventPublisher.publishEvent(source.getTargetTopic(), "test-key-" + System.currentTimeMillis(), testPayload);

        source.setTotalEventsIngested(source.getTotalEventsIngested() + 1);
        source.setLastIngestedAt(LocalDateTime.now());
        repository.save(source);

        Map<String, Object> res = new HashMap<>();
        res.put("status", "success");
        res.put("message", "Dispatched test event to topic '" + source.getTargetTopic() + "'");
        res.put("topic", source.getTargetTopic());
        res.put("totalEventsIngested", source.getTotalEventsIngested());
        return res;
    }

    private LiveDataSourceDto mapToDto(LiveDataSource entity) {
        return LiveDataSourceDto.builder()
                .id(entity.getId())
                .sourceName(entity.getSourceName())
                .sourceType(entity.getSourceType())
                .targetTopic(entity.getTargetTopic())
                .endpointUrl(entity.getEndpointUrl())
                .status(entity.getStatus())
                .ingestionRatePerSec(entity.getIngestionRatePerSec())
                .totalEventsIngested(entity.getTotalEventsIngested())
                .hdfsSinkPath(entity.getHdfsSinkPath())
                .schemaFormat(entity.getSchemaFormat())
                .description(entity.getDescription())
                .lastIngestedAt(entity.getLastIngestedAt())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
