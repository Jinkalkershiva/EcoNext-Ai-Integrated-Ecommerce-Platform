package com.econext.order.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShipmentItemResponse {
    private Long id;
    private Long orderItemId;
    private Long productId;
    private String productName;
    private Integer quantity;
    private LocalDateTime createdAt;
}
