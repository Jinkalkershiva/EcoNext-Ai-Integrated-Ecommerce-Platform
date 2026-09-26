package com.econext.admin.controller;

import com.econext.admin.dto.request.AuditLogCreateRequest;
import com.econext.admin.dto.response.ApiResponse;
import com.econext.admin.dto.response.AuditLogResponse;
import com.econext.admin.dto.response.StaffActivityMetricResponse;
import com.econext.admin.service.AuditService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Tag(name = "Audit & Staff Telemetry", description = "Endpoints for queryable audit trails, operational events and factual staff activity metrics")
public class AuditController {

    private final AuditService auditService;

    @GetMapping("/audit")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('AUDIT_READ')")
    @Operation(summary = "Search and filter immutable audit log records")
    public ResponseEntity<ApiResponse<Page<AuditLogResponse>>> getAuditLogs(
            @RequestParam(required = false) String actor,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String resourceType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fromTime,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime toTime,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "timestamp"));
        Page<AuditLogResponse> logs = auditService.searchAuditLogs(actor, action, resourceType, fromTime, toTime, pageable);
        return ResponseEntity.ok(ApiResponse.ok(logs));
    }

    @GetMapping("/audit/recent")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('AUDIT_READ')")
    @Operation(summary = "Get 10 most recent operational audit events for dashboard feed")
    public ResponseEntity<ApiResponse<List<AuditLogResponse>>> getRecentLogs() {
        List<AuditLogResponse> recent = auditService.getRecentActivity();
        return ResponseEntity.ok(ApiResponse.ok(recent));
    }

    @GetMapping("/staff/activity-metrics")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('STAFF_READ')")
    @Operation(summary = "Get factual staff performance and operational activity counts")
    public ResponseEntity<ApiResponse<List<StaffActivityMetricResponse>>> getStaffActivityMetrics() {
        List<StaffActivityMetricResponse> metrics = auditService.getStaffActivityMetrics();
        return ResponseEntity.ok(ApiResponse.ok(metrics));
    }

    @PostMapping("/audit/log")
    @Operation(summary = "Internal ingestion endpoint for microservices to publish audit events")
    public ResponseEntity<ApiResponse<AuditLogResponse>> createAuditLog(@Valid @RequestBody AuditLogCreateRequest request) {
        AuditLogResponse log = auditService.recordAuditFromRequest(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(log));
    }
}
