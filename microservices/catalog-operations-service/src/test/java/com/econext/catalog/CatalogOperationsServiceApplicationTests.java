package com.econext.catalog;

import com.econext.catalog.dto.CategoryCreateRequest;
import com.econext.catalog.dto.CategoryResponse;
import com.econext.catalog.dto.CategoryUpdateRequest;
import com.econext.catalog.dto.ProductCreateRequest;
import com.econext.catalog.dto.ProductResponse;
import com.econext.catalog.dto.ProductUpdateRequest;
import com.econext.catalog.dto.StockAdjustmentRequest;
import com.econext.catalog.dto.StockAdjustmentResponse;
import com.econext.catalog.dto.StockSummaryResponse;
import com.econext.catalog.entity.ProductStatus;
import com.econext.catalog.entity.StockAdjustmentType;
import com.econext.catalog.service.OperationalCatalogService;
import com.econext.catalog.service.OperationalInventoryService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class CatalogOperationsServiceApplicationTests {

    @Autowired
    private OperationalCatalogService catalogService;

    @Autowired
    private OperationalInventoryService inventoryService;

    @Test
    @DisplayName("1. Catalog Product & Category Full CRUD with Search and Pagination")
    void testCatalogProductAndCategoryCrud() {
        // 1. Create Category
        CategoryCreateRequest catReq = CategoryCreateRequest.builder()
                .name("Sustainable Living")
                .description("Eco-friendly lifestyle and homeware")
                .build();
        CategoryResponse category = catalogService.createCategory(catReq, "admin");
        assertNotNull(category.getId());
        assertEquals("Sustainable Living", category.getName());

        // Update Category
        CategoryUpdateRequest catUpdate = CategoryUpdateRequest.builder()
                .name("Sustainable Living & Homeware")
                .description("Updated description")
                .build();
        CategoryResponse updatedCat = catalogService.updateCategory(category.getId(), catUpdate, "admin");
        assertEquals("Sustainable Living & Homeware", updatedCat.getName());

        // 2. Create Product with Eco Metrics
        ProductCreateRequest prodReq = ProductCreateRequest.builder()
                .name("Zero-Waste Bamboo Cutlery Set")
                .description("Portable travel cutlery set made from sustainably harvested bamboo")
                .categoryId(category.getId())
                .currentPrice(new BigDecimal("699.00"))
                .stock(50)
                .lowStockThreshold(10)
                .sustainabilityScore(9.8)
                .popularityScore(4.9)
                .tags(List.of("bamboo", "zero-waste", "kitchen"))
                .build();

        ProductResponse product = catalogService.createProduct(prodReq, "catalog_staff");
        assertNotNull(product.getId());
        assertEquals("Zero-Waste Bamboo Cutlery Set", product.getName());
        assertEquals(ProductStatus.ACTIVE, product.getStatus());
        assertEquals(50, product.getStock());

        // 3. Update Product
        ProductUpdateRequest prodUpdate = ProductUpdateRequest.builder()
                .name("Zero-Waste Bamboo Cutlery Set (Deluxe)")
                .description("Includes organic hemp carrying pouch")
                .currentPrice(new BigDecimal("799.00"))
                .categoryId(category.getId())
                .sustainabilityScore(9.9)
                .status(ProductStatus.ACTIVE)
                .build();

        ProductResponse updatedProd = catalogService.updateProduct(product.getId(), prodUpdate, "catalog_staff");
        assertEquals("Zero-Waste Bamboo Cutlery Set (Deluxe)", updatedProd.getName());
        assertEquals(new BigDecimal("799.00"), updatedProd.getCurrentPrice());

        // 4. Search and Pagination
        Page<ProductResponse> searchResult = catalogService.searchProducts(
                "Bamboo",
                category.getId(),
                ProductStatus.ACTIVE,
                null,
                PageRequest.of(0, 10)
        );
        assertTrue(searchResult.getTotalElements() >= 1);
        assertEquals("Zero-Waste Bamboo Cutlery Set (Deluxe)", searchResult.getContent().get(0).getName());

        // 5. Delete Product (Soft-delete / Archive status)
        catalogService.deleteProduct(product.getId(), "admin");
        ProductResponse deactivated = catalogService.getProductById(product.getId());
        assertEquals(ProductStatus.ARCHIVED, deactivated.getStatus());
    }

    @Test
    @DisplayName("2. Inventory Stock Ledger: Positive & Negative Adjustments, Audit History, Low Stock Detection")
    void testInventoryStockLedgerAndLowStockDetection() {
        // 1. Create Category and Initial Product with stock = 15, lowStockThreshold = 10
        CategoryResponse cat = catalogService.createCategory(
                CategoryCreateRequest.builder().name("Kitchen").description("Zero waste kitchen").build(),
                "admin"
        );

        ProductResponse product = catalogService.createProduct(
                ProductCreateRequest.builder()
                        .name("Stainless Steel Straw Set")
                        .description("Re-usable straws")
                        .categoryId(cat.getId())
                        .currentPrice(new BigDecimal("299.00"))
                        .stock(15)
                        .lowStockThreshold(10)
                        .sustainabilityScore(9.2)
                        .build(),
                "catalog_staff"
        );

        // 2. Positive Adjustment (ADD +20)
        StockAdjustmentRequest addReq = StockAdjustmentRequest.builder()
                .productId(product.getId())
                .adjustmentType(StockAdjustmentType.ADD)
                .quantity(20)
                .reason("Batch replenishment from manufacturer")
                .build();

        StockAdjustmentResponse addRes = inventoryService.adjustStock(addReq, 101L, "inv_staff");
        assertEquals(35, addRes.getNewStock());
        assertEquals(15, addRes.getPreviousStock());
        assertEquals(20, addRes.getQuantityChanged());

        // 3. Negative Adjustment (SUBTRACT -30 -> stock becomes 5, below threshold 10)
        StockAdjustmentRequest removeReq = StockAdjustmentRequest.builder()
                .productId(product.getId())
                .adjustmentType(StockAdjustmentType.SUBTRACT)
                .quantity(30)
                .reason("Allocated for corporate bulk gift order")
                .build();

        StockAdjustmentResponse removeRes = inventoryService.adjustStock(removeReq, 101L, "inv_staff");
        assertEquals(5, removeRes.getNewStock());
        assertEquals(35, removeRes.getPreviousStock());
        assertEquals(-30, removeRes.getQuantityChanged());

        // 4. Low-Stock Detection & Stock Summary
        StockSummaryResponse summary = inventoryService.getStockSummary();
        assertNotNull(summary);
        assertTrue(summary.getLowStockCount() >= 1, "Stock of 5 against threshold of 10 must count in lowStockCount");

        // 5. Stock Adjustment Audit Ledger
        Page<StockAdjustmentResponse> history = inventoryService.getProductAdjustments(product.getId(), PageRequest.of(0, 10));
        assertEquals(2, history.getTotalElements());
    }
}
