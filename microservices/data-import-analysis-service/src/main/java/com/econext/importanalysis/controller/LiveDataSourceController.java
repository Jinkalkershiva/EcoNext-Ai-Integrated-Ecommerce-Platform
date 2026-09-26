package com.econext.importanalysis.controller;

import com.econext.importanalysis.dto.ApiResponse;
import com.econext.importanalysis.dto.LiveDataSourceDto;
import com.econext.importanalysis.service.LiveDataSourceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/import/sources")
@RequiredArgsConstructor
@Tag(name = "Live Ingestion Data Sources", description = "Endpoints for configuring and streaming live event feeds into Kafka and HDFS Data Lake")
public class LiveDataSourceController {

    private final LiveDataSourceService liveDataSourceService;

    @GetMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('DATA_IMPORT') or hasAuthority('DATA_ANALYSIS') or hasAuthority('ROLE_STAFF')")
    @Operation(summary = "List all active and configured live streaming ingestion pipelines")
    public ResponseEntity<ApiResponse<List<LiveDataSourceDto>>> getAllSources() {
        List<LiveDataSourceDto> list = liveDataSourceService.getAllSources();
        return ResponseEntity.ok(ApiResponse.ok(list));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('DATA_IMPORT') or hasAuthority('DATA_ANALYSIS') or hasAuthority('ROLE_STAFF')")
    @Operation(summary = "Get specific live data source configuration and telemetry")
    public ResponseEntity<ApiResponse<LiveDataSourceDto>> getSourceById(@PathVariable Long id) {
        LiveDataSourceDto dto = liveDataSourceService.getSourceById(id);
        return ResponseEntity.ok(ApiResponse.ok(dto));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('DATA_IMPORT')")
    @Operation(summary = "Register new live data source / streaming ingest topic")
    public ResponseEntity<ApiResponse<LiveDataSourceDto>> createSource(@RequestBody LiveDataSourceDto dto) {
        LiveDataSourceDto created = liveDataSourceService.createSource(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(created));
    }

    @PostMapping("/{id}/toggle")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('DATA_IMPORT')")
    @Operation(summary = "Toggle live source streaming status (Active / Paused)")
    public ResponseEntity<ApiResponse<LiveDataSourceDto>> toggleStatus(@PathVariable Long id) {
        LiveDataSourceDto updated = liveDataSourceService.toggleStatus(id);
        return ResponseEntity.ok(ApiResponse.ok(updated));
    }

    @PostMapping("/{id}/test-event")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('DATA_IMPORT')")
    @Operation(summary = "Dispatch a test payload through Kafka and track stream progression")
    public ResponseEntity<ApiResponse<Map<String, Object>>> dispatchTestEvent(@PathVariable Long id) {
        Map<String, Object> result = liveDataSourceService.dispatchTestEvent(id);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }
}
