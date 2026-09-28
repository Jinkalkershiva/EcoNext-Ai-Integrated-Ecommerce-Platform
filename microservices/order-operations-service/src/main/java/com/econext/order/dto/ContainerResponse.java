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
    private String origin;
    private String destination;
    private String route;
    private BigDecimal currentLatitude;
    private BigDecimal currentLongitude;
    private LocalDateTime lastLocationUpdate;
    private int shipmentCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
