package com.econext.catalog.dto;

import com.econext.catalog.entity.ProductStatus;
import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
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
    @JsonAlias({"categoryId", "category_id", "category"})
    private Long categoryId;

    private String subcategoryName;

    @NotNull(message = "Current price is required")
    @DecimalMin(value = "0.01", message = "Price must be greater than 0")
    @JsonAlias({"price", "current_price", "currentPrice"})
    private BigDecimal currentPrice;

    @JsonAlias({"imageUrl", "image_url"})
    private String imageUrl;

    @JsonAlias({"additionalImages", "additional_images", "additionalImageUrls"})
    private List<String> additionalImages;

    @Min(value = 0, message = "Stock cannot be negative")
    @Builder.Default
    @JsonAlias({"stockQuantity", "stock", "quantity"})
    private Integer stock = 0;

    @Builder.Default
    private Integer lowStockThreshold = 5;

    @Builder.Default
    @JsonAlias({"sustainabilityScore", "sustainability_score"})
    private Double sustainabilityScore = 8.5;

    @Builder.Default
    @JsonAlias({"popularityScore", "popularity_score"})
    private Double popularityScore = 5.0;

    private List<String> tags;
    private List<String> ecoTags;
    private String sku;

    @Builder.Default
    private ProductStatus status = ProductStatus.ACTIVE;

    @JsonProperty("tags")
    public void setTagsObject(Object rawTags) {
        if (rawTags instanceof String str) {
            this.tags = Arrays.stream(str.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .toList();
        } else if (rawTags instanceof List<?> list) {
            this.tags = list.stream().map(Object::toString).toList();
        }
    }

    @JsonProperty("additionalImages")
    public void setAdditionalImagesObject(Object raw) {
        if (raw instanceof String str) {
            this.additionalImages = Arrays.stream(str.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .toList();
        } else if (raw instanceof List<?> list) {
            this.additionalImages = list.stream().map(Object::toString).toList();
        }
    }
}
