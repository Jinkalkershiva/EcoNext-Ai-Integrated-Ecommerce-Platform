package com.econext.catalog.dto;

import com.econext.catalog.entity.ProductStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductUpdateRequest {
    private String name;
    private String description;
    private Long categoryId;
    private String subcategoryName;

    @DecimalMin(value = "0.01", message = "Price must be greater than 0")
    private BigDecimal currentPrice;

    private String imageUrl;

    @Min(value = 0, message = "Stock cannot be negative")
    private Integer stock;

    private Integer lowStockThreshold;
    private Double sustainabilityScore;
    private Double popularityScore;
    private List<String> tags;
    private List<String> ecoTags;
    private ProductStatus status;
}
