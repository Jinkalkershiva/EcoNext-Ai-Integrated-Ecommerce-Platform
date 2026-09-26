package com.econext.catalog.dto;

import com.econext.catalog.entity.ProductStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
public class ProductCreateRequest {

    @NotBlank(message = "Product name is required")
    private String name;

    @NotBlank(message = "Description is required")
    private String description;

    @NotNull(message = "Category ID is required")
    private Long categoryId;

    private String subcategoryName;

    @NotNull(message = "Current price is required")
    @DecimalMin(value = "0.01", message = "Price must be greater than 0")
    private BigDecimal currentPrice;

    private String imageUrl;

    @Min(value = 0, message = "Stock cannot be negative")
    @Builder.Default
    private Integer stock = 0;

    @Builder.Default
    private Integer lowStockThreshold = 5;

    @Builder.Default
    private Double sustainabilityScore = 8.5;

    @Builder.Default
    private Double popularityScore = 5.0;

    private List<String> tags;
    private List<String> ecoTags;

    @Builder.Default
    private ProductStatus status = ProductStatus.ACTIVE;
}
