package com.econext.order.dto;

import com.econext.order.entity.ContainerStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContainerResponse {
    private Long id;
    private String containerCode;
    private ContainerStatus status;
    private String warehouse;
    private Long driverId;
    private String driverCode;
    private String driverName;
    private String origin;
    private String destination;
    private String route;
    private String vehicleNumber;
    private BigDecimal maxWeightKg;
    private BigDecimal maxVolumeM3;
    private BigDecimal usedWeightKg;
    private BigDecimal usedVolumeM3;
    private BigDecimal remainingWeightKg;
    private BigDecimal remainingVolumeM3;
    private Double weightUtilizationPercent;
    private Double volumeUtilizationPercent;
    private Boolean canAcceptShipments;
    private BigDecimal currentLatitude;
    private BigDecimal currentLongitude;
    private LocalDateTime lastLocationUpdate;
    private int shipmentCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
