package com.econext.catalog.controller;

import com.econext.catalog.dto.*;
import com.econext.catalog.entity.ProductStatus;
import com.econext.catalog.security.OperationalStaffPrincipal;
import com.econext.catalog.service.OperationalCatalogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/catalog-ops")
@RequiredArgsConstructor
@Tag(name = "Catalog Operations", description = "Operational management for products, categories, pricing, attributes and stock")
public class CatalogOperationsController {

    private final OperationalCatalogService catalogService;

    // ==================== PRODUCTS ====================

    @GetMapping("/products")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('CATALOG_READ')")
    @Operation(summary = "Search and filter operational catalog products")
    public ResponseEntity<ApiResponse<Page<ProductResponse>>> searchProducts(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) ProductStatus status,
            @RequestParam(required = false) String stockFilter,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDir
    ) {
        Sort sort = sortDir.equalsIgnoreCase("ASC") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);
        Page<ProductResponse> products = catalogService.searchProducts(search, categoryId, status, stockFilter, pageable);
        return ResponseEntity.ok(ApiResponse.ok(products));
    }

    @GetMapping("/products/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('CATALOG_READ')")
    @Operation(summary = "Get product details by ID")
    public ResponseEntity<ApiResponse<ProductResponse>> getProductById(@PathVariable Long id) {
        ProductResponse product = catalogService.getProductById(id);
        return ResponseEntity.ok(ApiResponse.ok(product));
    }

    @PostMapping("/products")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('CATALOG_CREATE')")
    @Operation(summary = "Create a new catalog product (Manual Data Entry)")
    public ResponseEntity<ApiResponse<ProductResponse>> createProduct(
            @Valid @RequestBody ProductCreateRequest request,
            @AuthenticationPrincipal OperationalStaffPrincipal principal
    ) {
        String actor = principal != null ? principal.getUsername() : "ADMIN";
        ProductResponse created = catalogService.createProduct(request, actor);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Product created successfully", created));
    }

    @PutMapping("/products/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('CATALOG_UPDATE')")
    @Operation(summary = "Update product details, pricing, attributes or category")
    public ResponseEntity<ApiResponse<ProductResponse>> updateProduct(
            @PathVariable Long id,
            @Valid @RequestBody ProductUpdateRequest request,
            @AuthenticationPrincipal OperationalStaffPrincipal principal
    ) {
        String actor = principal != null ? principal.getUsername() : "ADMIN";
        ProductResponse updated = catalogService.updateProduct(id, request, actor);
        return ResponseEntity.ok(ApiResponse.ok("Product updated successfully", updated));
    }

    @DeleteMapping("/products/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('CATALOG_DELETE')")
    @Operation(summary = "Archive / deactivate a product")
    public ResponseEntity<ApiResponse<Void>> deleteProduct(
            @PathVariable Long id,
            @AuthenticationPrincipal OperationalStaffPrincipal principal
    ) {
        String actor = principal != null ? principal.getUsername() : "ADMIN";
        catalogService.deleteProduct(id, actor);
        return ResponseEntity.ok(ApiResponse.ok("Product archived successfully", null));
    }

    // ==================== CATEGORIES ====================

    @GetMapping("/categories")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('CATALOG_READ')")
    @Operation(summary = "List all operational product categories")
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> getAllCategories() {
        List<CategoryResponse> categories = catalogService.getAllCategories();
        return ResponseEntity.ok(ApiResponse.ok(categories));
    }

    @GetMapping("/categories/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('CATALOG_READ')")
    @Operation(summary = "Get category details by ID")
    public ResponseEntity<ApiResponse<CategoryResponse>> getCategoryById(@PathVariable Long id) {
        CategoryResponse category = catalogService.getCategoryById(id);
        return ResponseEntity.ok(ApiResponse.ok(category));
    }

    @PostMapping("/categories")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('CATALOG_CREATE')")
    @Operation(summary = "Create a new product category")
    public ResponseEntity<ApiResponse<CategoryResponse>> createCategory(
            @Valid @RequestBody CategoryCreateRequest request,
            @AuthenticationPrincipal OperationalStaffPrincipal principal
    ) {
        String actor = principal != null ? principal.getUsername() : "ADMIN";
        CategoryResponse created = catalogService.createCategory(request, actor);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Category created successfully", created));
    }

    @PutMapping("/categories/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('CATALOG_UPDATE')")
    @Operation(summary = "Update category name or description")
    public ResponseEntity<ApiResponse<CategoryResponse>> updateCategory(
            @PathVariable Long id,
            @Valid @RequestBody CategoryUpdateRequest request,
            @AuthenticationPrincipal OperationalStaffPrincipal principal
    ) {
        String actor = principal != null ? principal.getUsername() : "ADMIN";
        CategoryResponse updated = catalogService.updateCategory(id, request, actor);
        return ResponseEntity.ok(ApiResponse.ok("Category updated successfully", updated));
    }

    @DeleteMapping("/categories/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('CATALOG_DELETE')")
    @Operation(summary = "Delete an empty product category")
    public ResponseEntity<ApiResponse<Void>> deleteCategory(
            @PathVariable Long id,
            @AuthenticationPrincipal OperationalStaffPrincipal principal
    ) {
        String actor = principal != null ? principal.getUsername() : "ADMIN";
        catalogService.deleteCategory(id, actor);
        return ResponseEntity.ok(ApiResponse.ok("Category deleted successfully", null));
    }
}
