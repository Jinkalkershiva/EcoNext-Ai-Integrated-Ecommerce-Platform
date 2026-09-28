package com.econext.order.dto;

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
public class LogisticsTrackingResponse {
    private Long id;
    private Long shipmentId;
    private Long containerId;
    private String status;
    private String locationName;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String description;
    private LocalDateTime timestamp;
}
