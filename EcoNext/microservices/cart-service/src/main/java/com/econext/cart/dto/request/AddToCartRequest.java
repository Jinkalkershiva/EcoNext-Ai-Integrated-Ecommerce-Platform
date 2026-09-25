package com.econext.cart.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AddToCartRequest {

    @NotNull(message = "Product ID is required")
    @JsonAlias({"product_id", "product", "productId"})
    private Long productId;

    @Min(value = 1, message = "Quantity must be at least 1")
    @Max(value = 99, message = "Quantity cannot exceed 99 per item")
    @Builder.Default
    private Integer quantity = 1;

    @JsonAlias({"product_name", "productName", "name"})
    private String productName;

    @JsonAlias({"product_image", "productImage", "image"})
    private String productImage;

    @JsonAlias({"unit_price", "unitPrice", "price", "current_price"})
    private BigDecimal unitPrice;
}
