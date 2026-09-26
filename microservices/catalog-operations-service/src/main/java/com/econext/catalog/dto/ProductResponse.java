package com.econext.catalog.dto;

import com.econext.catalog.entity.ProductStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductResponse {
    private Long id;
    private String name;
    private String description;
    private Long categoryId;
    private String categoryName;
    private String subcategoryName;
    private BigDecimal currentPrice;
    private String imageUrl;
    private Integer stock;
    private Integer lowStockThreshold;
    private boolean lowStock;
    private boolean outOfStock;
    private Double sustainabilityScore;
    private Double popularityScore;
    private List<String> tags;
    private List<String> ecoTags;
    private ProductStatus status;
    private Long djangoProductId;
    private String createdByStaff;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
