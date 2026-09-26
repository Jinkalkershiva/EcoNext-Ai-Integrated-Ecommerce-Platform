package com.econext.importanalysis.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "live_data_sources")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LiveDataSource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String sourceName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private DataSourceType sourceType;

    @Column(nullable = false, length = 120)
    private String targetTopic;

    @Column(length = 255)
    private String endpointUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private SourceStatus status = SourceStatus.ACTIVE;

    @Column(nullable = false)
    @Builder.Default
    private Double ingestionRatePerSec = 0.0;

    @Column(nullable = false)
    @Builder.Default
    private Long totalEventsIngested = 0L;

    @Column(length = 255)
    private String hdfsSinkPath;

    @Column(length = 50)
    @Builder.Default
    private String schemaFormat = "JSON_EVENT";

    @Column(length = 500)
    private String description;

    private LocalDateTime lastIngestedAt;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
