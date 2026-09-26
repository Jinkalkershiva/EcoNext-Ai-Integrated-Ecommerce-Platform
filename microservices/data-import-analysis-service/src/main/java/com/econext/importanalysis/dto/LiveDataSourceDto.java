package com.econext.importanalysis.dto;

import com.econext.importanalysis.entity.DataSourceType;
import com.econext.importanalysis.entity.SourceStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LiveDataSourceDto {
    private Long id;
    private String sourceName;
    private DataSourceType sourceType;
    private String targetTopic;
    private String endpointUrl;
    private SourceStatus status;
    private Double ingestionRatePerSec;
    private Long totalEventsIngested;
    private String hdfsSinkPath;
    private String schemaFormat;
    private String description;
    private LocalDateTime lastIngestedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
