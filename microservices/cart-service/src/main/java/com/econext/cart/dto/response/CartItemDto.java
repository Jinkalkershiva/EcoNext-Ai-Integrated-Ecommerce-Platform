package com.econext.cart.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CartItemDto {

    private Long id;

    @JsonProperty("product_id")
    private Long productId;

    @JsonProperty("product_name")
    private String productName;

    @JsonProperty("product_image")
    private String productImage;

    @JsonProperty("unit_price")
    private BigDecimal unitPrice;

    private Integer quantity;

    private BigDecimal subtotal;

    @JsonProperty("added_at")
    private LocalDateTime addedAt;
}
