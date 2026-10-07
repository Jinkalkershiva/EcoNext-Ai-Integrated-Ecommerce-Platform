package com.econext.order.dto;

import com.econext.order.entity.ShipmentStatus;
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
public class ShipmentResponse {
    private Long id;
    private String shipmentNumber;
    private Long orderId;
    private Long containerId;
    private String containerCode;
    private ShipmentStatus status;
    private String carrierName;
    private String trackingNumber;
    private String warehouse;
    private Long driverId;
    private String driverCode;
    private String driverName;
    private String driverPhone;
    private String vehicleNumber;
    private String origin;
    private String destination;
    private String route;
    private Boolean isCompatible;
    private String compatibilityReason;

    // Capacity & telemetry attributes
    private BigDecimal maxWeight;
    private BigDecimal maxVolume;
    private BigDecimal usedWeight;
    private BigDecimal usedVolume;
    private BigDecimal remainingWeight;
    private BigDecimal remainingVolume;
    private Double weightUtilizationPercent;
    private Double volumeUtilizationPercent;
    private Integer assignedOrderCount;
    private Boolean canAcceptOrders;

    private LocalDateTime estimatedDelivery;
    private LocalDateTime dispatchedAt;
    private LocalDateTime deliveredAt;

    private BigDecimal currentLatitude;
    private BigDecimal currentLongitude;
    private LocalDateTime lastLocationUpdate;
    private List<ShipmentItemResponse> items;
    private List<ShipmentEventResponse> events;
    private List<OrderResponse> assignedOrders;
    private List<Long> assignedOrderIds;
    private List<String> assignedOrderRefNumbers;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
