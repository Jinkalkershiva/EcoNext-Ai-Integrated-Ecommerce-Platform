package com.econext.order.dto;

import com.econext.order.entity.OrderStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderStatusUpdateRequest {
    @NotNull(message = "New target status is required")
    private OrderStatus newStatus;

    private String reasonNote;

    private String carrierName;

    private String trackingNumber;
}
