package com.econext.importanalysis.controller;

import com.econext.importanalysis.dto.*;
import com.econext.importanalysis.security.JwtTokenFilter.OperationalStaffPrincipal;
import com.econext.importanalysis.service.DataImportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/import")
@RequiredArgsConstructor
@Tag(name = "Data Import Pipeline", description = "Multi-step upload, header detection, column mapping, validation preview and bulk execution engine for CSV and Excel")
public class DataImportController {

    private final DataImportService importService;

    // Step 1: Called by API Gateway (/api/import/upload) from ImportWizardPage.
    // Parses CSV/XLSX byte streams and extracts detected column headers.
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('DATA_IMPORT')")
    @Operation(summary = "Step 1: Upload CSV or Excel file and extract detected column headers")
    public ResponseEntity<ApiResponse<HeaderDetectionResponse>> uploadFile(@RequestParam("file") MultipartFile file) throws Exception {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Uploaded file is empty"));
        }
        HeaderDetectionResponse detection = importService.uploadAndDetectHeaders(file);
        return ResponseEntity.ok(ApiResponse.ok("File uploaded and headers detected successfully", detection));
    }

    // Step 2: Called by API Gateway (/api/import/preview) with column mappings.
    // Validates data types, checks DB and in-file duplicate SKUs, and generates validation previews.
    @PostMapping("/preview")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('DATA_IMPORT')")
    @Operation(summary = "Step 2: Map columns, validate records, detect duplicates and preview rows")
    public ResponseEntity<ApiResponse<ImportPreviewResponse>> previewImport(@Valid @RequestBody ImportPreviewRequest request) throws Exception {
        ImportPreviewResponse preview = importService.previewImport(request);
        return ResponseEntity.ok(ApiResponse.ok("Preview generated successfully", preview));
    }

    // Step 3: Called by API Gateway (/api/import/execute) after staff review.
    // Ingests validated rows into MySQL catalog and writes summary reports and audit logs.
    @PostMapping("/execute")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('DATA_IMPORT')")
    @Operation(summary = "Step 3: Confirm and execute bulk import of validated records into catalog")
    public ResponseEntity<ApiResponse<ImportJobResponse>> executeImport(
            @Valid @RequestBody ImportExecuteRequest request,
            @AuthenticationPrincipal OperationalStaffPrincipal principal,
            HttpServletRequest httpRequest
    ) throws Exception {
        String staffUsername = principal != null ? principal.getUsername() : "ADMIN";
        String jwtToken = httpRequest.getHeader(HttpHeaders.AUTHORIZATION);
        ImportJobResponse job = importService.executeImport(request, staffUsername, jwtToken);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Data import executed successfully", job));
    }

    @GetMapping("/history")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('DATA_IMPORT') or hasAuthority('DATA_ANALYSIS')")
    @Operation(summary = "List historical data import jobs and their status summaries")
    public ResponseEntity<ApiResponse<Page<ImportJobResponse>>> getImportHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<ImportJobResponse> history = importService.getImportHistory(pageable);
        return ResponseEntity.ok(ApiResponse.ok(history));
    }

    @GetMapping("/jobs/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('DATA_IMPORT') or hasAuthority('DATA_ANALYSIS')")
    @Operation(summary = "Get detailed report and error breakdown for an import job by ID")
    public ResponseEntity<ApiResponse<ImportJobResponse>> getImportJob(@PathVariable Long id) {
        ImportJobResponse job = importService.getImportJobById(id);
        return ResponseEntity.ok(ApiResponse.ok(job));
    }
}
