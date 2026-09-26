package com.econext.importanalysis.dto;

import com.econext.importanalysis.entity.ImportJobStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportJobResponse {
    private Long id;
    private String filename;
    private String fileType;
    private Integer totalRecords;
    private Integer validRecords;
    private Integer importedRecords;
    private Integer failedRecords;
    private Integer duplicateRecords;
    private ImportJobStatus status;
    private String staffUsername;
    private String errorReportJson;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;
}
