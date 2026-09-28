package com.econext.order.dto.ws;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShipmentLocationWsMessage implements Serializable {

    @Builder.Default
    private String eventType = "SHIPMENT_LOCATION_UPDATED";

    private Long shipmentId;
    private String shipmentNumber;
    private Long orderId;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String locationName;
    private String status;
    private String trackingNumber;
    private String vehicleNumber;
    private String note;

    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();
}
