package com.econext.importanalysis.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "operational_import_jobs", indexes = {
    @Index(name = "idx_import_staff", columnList = "staff_username"),
    @Index(name = "idx_import_status", columnList = "status"),
    @Index(name = "idx_import_time", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImportJob {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String filename;

    @Column(name = "file_type", nullable = false, length = 32)
    private String fileType; // CSV, XLSX, JSON

    @Column(name = "total_records")
    @Builder.Default
    private Integer totalRecords = 0;

    @Column(name = "valid_records")
    @Builder.Default
    private Integer validRecords = 0;

    @Column(name = "imported_records")
    @Builder.Default
    private Integer importedRecords = 0;

    @Column(name = "failed_records")
    @Builder.Default
    private Integer failedRecords = 0;

    @Column(name = "duplicate_records")
    @Builder.Default
    private Integer duplicateRecords = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private ImportJobStatus status = ImportJobStatus.UPLOADED;

    @Column(name = "staff_username", nullable = false, length = 64)
    private String staffUsername;

    @Column(name = "column_mapping_json", columnDefinition = "TEXT")
    private String columnMappingJson;

    @Column(name = "error_report_json", columnDefinition = "LONGTEXT")
    private String errorReportJson;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;
}
