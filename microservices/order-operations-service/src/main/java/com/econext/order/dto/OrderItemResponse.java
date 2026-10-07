package com.econext.order.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderItemResponse {
    private Long id;
    private Long productId;
    private String productName;
    private Integer quantity;
    private BigDecimal priceAtPurchase;
    private BigDecimal subtotal;
    private Boolean returnEligible;
    private Integer returnWindowDays;
    private String returnPolicy;
    private String conditionRequired;
    private BigDecimal weightKg;
    private BigDecimal volumeM3;
}
