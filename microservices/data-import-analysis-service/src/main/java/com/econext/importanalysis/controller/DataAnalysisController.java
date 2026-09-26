package com.econext.importanalysis.controller;

import com.econext.importanalysis.dto.AnalyticsKpiResponse;
import com.econext.importanalysis.dto.ApiResponse;
import com.econext.importanalysis.service.DataAnalysisService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
@Tag(name = "Data Analysis & Aggregation", description = "Endpoints for retrieving operational KPIs, sales metrics, inventory trends and exporting reports")
public class DataAnalysisController {

    private final DataAnalysisService analysisService;

    @GetMapping("/dashboard-kpis")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('DATA_ANALYSIS')")
    @Operation(summary = "Get aggregated operational KPIs for Admin & Staff operational dashboards")
    public ResponseEntity<ApiResponse<AnalyticsKpiResponse>> getDashboardKpis(HttpServletRequest httpRequest) {
        String token = httpRequest.getHeader(HttpHeaders.AUTHORIZATION);
        AnalyticsKpiResponse kpis = analysisService.getAggregatedKpis(token);
        return ResponseEntity.ok(ApiResponse.ok(kpis));
    }

    @GetMapping("/export/csv")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('DATA_EXPORT')")
    @Operation(summary = "Export operational KPIs and summary metrics as downloadable CSV report")
    public ResponseEntity<byte[]> exportCsv(HttpServletRequest httpRequest) {
        String token = httpRequest.getHeader(HttpHeaders.AUTHORIZATION);
        AnalyticsKpiResponse kpis = analysisService.getAggregatedKpis(token);
        String csvContent = analysisService.exportAnalyticsAsCsv(kpis);

        byte[] bytes = csvContent.getBytes();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=econext_operational_report.csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(bytes);
    }
}
