package com.econext.catalog.service;

import com.econext.catalog.dto.StockAdjustmentRequest;
import com.econext.catalog.dto.StockAdjustmentResponse;
import com.econext.catalog.dto.StockSummaryResponse;
import com.econext.catalog.entity.OperationalProduct;
import com.econext.catalog.entity.StockAdjustment;
import com.econext.catalog.exception.GlobalExceptionHandler.BadRequestException;
import com.econext.catalog.exception.GlobalExceptionHandler.ResourceNotFoundException;
import com.econext.catalog.repository.OperationalProductRepository;
import com.econext.catalog.repository.StockAdjustmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class OperationalInventoryService {

    private final OperationalProductRepository productRepository;
    private final StockAdjustmentRepository adjustmentRepository;
    private final DjangoSyncService djangoSyncService;

    @Transactional
    public StockAdjustmentResponse adjustStock(StockAdjustmentRequest request, Long staffId, String staffUsername) {
        OperationalProduct product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + request.getProductId()));

        int previousStock = product.getStock();
        int newStock;

        switch (request.getAdjustmentType()) {
            case ADD:
            case RETURN_RESTOCK:
                if (request.getQuantity() <= 0) {
                    throw new BadRequestException("Quantity to add must be positive");
                }
                newStock = previousStock + request.getQuantity();
                break;
            case SUBTRACT:
            case DAMAGE_LOSS:
                if (request.getQuantity() <= 0) {
                    throw new BadRequestException("Quantity to subtract must be positive");
                }
                if (previousStock < request.getQuantity()) {
                    throw new BadRequestException("Cannot subtract " + request.getQuantity() + " units from existing stock of " + previousStock);
                }
                newStock = previousStock - request.getQuantity();
                break;
            case SET:
            case AUDIT_CORRECTION:
                if (request.getQuantity() < 0) {
                    throw new BadRequestException("Stock count cannot be negative");
                }
                newStock = request.getQuantity();
                break;
            default:
                throw new BadRequestException("Unsupported adjustment type");
        }

        product.setStock(newStock);
        productRepository.save(product);

        StockAdjustment adjustment = StockAdjustment.builder()
                .productId(product.getId())
                .productName(product.getName())
                .adjustmentType(request.getAdjustmentType())
                .quantityChanged(newStock - previousStock)
                .previousStock(previousStock)
                .newStock(newStock)
                .reason(request.getReason())
                .staffId(staffId)
                .staffUsername(staffUsername)
                .build();

        StockAdjustment savedAdjustment = adjustmentRepository.save(adjustment);

        // Sync stock change to Django
        djangoSyncService.syncStockUpdateToDjango(product.getDjangoProductId(), newStock);

        return mapAdjustmentToResponse(savedAdjustment);
    }

    @Transactional(readOnly = true)
    public StockSummaryResponse getStockSummary() {
        long total = productRepository.count();
        long inStock = productRepository.countInStockProducts();
        long lowStock = productRepository.countLowStockProducts();
        long outOfStock = productRepository.countOutOfStockProducts();

        Map<String, Long> categoryCounts = new HashMap<>();
        List<Object[]> categoryData = productRepository.countProductsByCategory();
        for (Object[] row : categoryData) {
            if (row[0] != null) {
                categoryCounts.put((String) row[0], ((Number) row[1]).longValue());
            }
        }

        return StockSummaryResponse.builder()
                .totalProducts(total)
                .inStockCount(inStock)
                .lowStockCount(lowStock)
                .outOfStockCount(outOfStock)
                .categoryStockCounts(categoryCounts)
                .build();
    }

    @Transactional(readOnly = true)
    public Page<StockAdjustmentResponse> getProductAdjustments(Long productId, Pageable pageable) {
        return adjustmentRepository.findByProductIdOrderByTimestampDesc(productId, pageable)
                .map(this::mapAdjustmentToResponse);
    }

    @Transactional(readOnly = true)
    public List<StockAdjustmentResponse> getRecentAdjustments() {
        return adjustmentRepository.findTop10ByOrderByTimestampDesc().stream()
                .map(this::mapAdjustmentToResponse)
                .collect(Collectors.toList());
    }

    private StockAdjustmentResponse mapAdjustmentToResponse(StockAdjustment adj) {
        return StockAdjustmentResponse.builder()
                .id(adj.getId())
                .productId(adj.getProductId())
                .productName(adj.getProductName())
                .adjustmentType(adj.getAdjustmentType())
                .quantityChanged(adj.getQuantityChanged())
                .previousStock(adj.getPreviousStock())
                .newStock(adj.getNewStock())
                .reason(adj.getReason())
                .staffId(adj.getStaffId())
                .staffUsername(adj.getStaffUsername())
                .timestamp(adj.getTimestamp())
                .build();
    }
}
