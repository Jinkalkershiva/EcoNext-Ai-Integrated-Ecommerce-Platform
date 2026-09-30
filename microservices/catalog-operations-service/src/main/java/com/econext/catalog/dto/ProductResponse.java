package com.econext.catalog.dto;

import com.econext.catalog.entity.ProductStatus;
import com.fasterxml.jackson.annotation.JsonProperty;
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
    private List<String> additionalImages;
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

    @JsonProperty("price")
    public BigDecimal getPrice() {
        return currentPrice;
    }

    @JsonProperty("stockQuantity")
    public Integer getStockQuantity() {
        return stock;
    }

    @JsonProperty("sku")
    public String getSku() {
        if (tags != null) {
            for (String t : tags) {
                if (t.toUpperCase().startsWith("SKU:")) {
                    return t.substring(4).trim();
                } else if (t.toUpperCase().startsWith("ECO-")) {
                    return t.trim();
                }
            }
        }
        return String.format("ECO-PROD-%04d", id != null ? id : 0);
    }
}
