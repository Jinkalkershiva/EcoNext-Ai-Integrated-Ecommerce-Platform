package com.econext.catalog.controller;

import com.econext.catalog.dto.ApiResponse;
import com.econext.catalog.dto.StockAdjustmentRequest;
import com.econext.catalog.dto.StockAdjustmentResponse;
import com.econext.catalog.dto.StockSummaryResponse;
import com.econext.catalog.security.OperationalStaffPrincipal;
import com.econext.catalog.service.OperationalInventoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inventory-ops")
@RequiredArgsConstructor
@Tag(name = "Inventory & Stock Operations", description = "Endpoints for inventory tracking, stock adjustments and low-stock alerts")
public class InventoryOperationsController {

    private final OperationalInventoryService inventoryService;

    // Called by API Gateway (/api/inventory-ops/adjust) from Admin Frontend (InventoryPage).
    // Mutates product quantity in MySQL and writes an immutable audit record to stock_adjustment_log.
    @PostMapping("/adjust")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('INVENTORY_ADJUST')")
    @Operation(summary = "Adjust inventory stock for a product with reason logging and staff attribution")
    public ResponseEntity<ApiResponse<StockAdjustmentResponse>> adjustStock(
            @Valid @RequestBody StockAdjustmentRequest request,
            @AuthenticationPrincipal OperationalStaffPrincipal principal
    ) {
        Long staffId = principal != null ? principal.getId() : null;
        String staffUsername = principal != null ? principal.getUsername() : "ADMIN";
        StockAdjustmentResponse response = inventoryService.adjustStock(request, staffId, staffUsername);
        return ResponseEntity.ok(ApiResponse.ok("Stock adjusted successfully", response));
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('INVENTORY_READ')")
    @Operation(summary = "Get inventory health summary (in-stock, low-stock, out-of-stock counts)")
    public ResponseEntity<ApiResponse<StockSummaryResponse>> getStockSummary() {
        StockSummaryResponse summary = inventoryService.getStockSummary();
        return ResponseEntity.ok(ApiResponse.ok(summary));
    }

    @GetMapping("/adjustments/product/{productId}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('INVENTORY_READ')")
    @Operation(summary = "Get historical stock adjustment logs for a specific product")
    public ResponseEntity<ApiResponse<Page<StockAdjustmentResponse>>> getProductAdjustments(
            @PathVariable Long productId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        Page<StockAdjustmentResponse> adjustments = inventoryService.getProductAdjustments(productId, pageable);
        return ResponseEntity.ok(ApiResponse.ok(adjustments));
    }

    @GetMapping("/adjustments/recent")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('INVENTORY_READ')")
    @Operation(summary = "Get 10 most recent stock adjustment operations")
    public ResponseEntity<ApiResponse<List<StockAdjustmentResponse>>> getRecentAdjustments() {
        List<StockAdjustmentResponse> recent = inventoryService.getRecentAdjustments();
        return ResponseEntity.ok(ApiResponse.ok(recent));
    }
}
