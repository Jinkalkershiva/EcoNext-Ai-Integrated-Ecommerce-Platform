package com.econext.order.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
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
public class CreateShipmentRequest {

    @NotNull(message = "Order ID is required")
    private Long orderId;

    private Long containerId;

    private String carrierName;

    private String trackingNumber;

    private String vehicleNumber;

    private String origin;

    private String destination;

    private String route;

    private BigDecimal currentLatitude;

    private BigDecimal currentLongitude;

    private LocalDateTime estimatedDelivery;

    @NotEmpty(message = "At least one item must be allocated to the shipment")
    private List<ShipmentItemAllocation> items;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ShipmentItemAllocation {
        @NotNull(message = "Order item ID is required")
        private Long orderItemId;

        private Long productId;

        private String productName;

        @NotNull(message = "Allocated quantity is required")
        private Integer quantity;
    }
}
