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
    private String vehicleNumber;
    private String origin;
    private String destination;
    private String route;
    private LocalDateTime estimatedDelivery;
    private BigDecimal currentLatitude;
    private BigDecimal currentLongitude;
    private LocalDateTime lastLocationUpdate;
    private List<ShipmentItemResponse> items;
    private List<ShipmentEventResponse> events;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
