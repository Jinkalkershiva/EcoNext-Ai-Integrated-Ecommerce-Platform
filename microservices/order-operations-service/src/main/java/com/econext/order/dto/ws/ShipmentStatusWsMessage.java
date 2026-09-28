package com.econext.order.dto.ws;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShipmentStatusWsMessage implements Serializable {

    @Builder.Default
    private String eventType = "SHIPMENT_STATUS_UPDATED";

    private Long shipmentId;
    private String shipmentNumber;
    private Long orderId;
    private String status;
    private String carrierName;
    private String trackingNumber;

    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();
}
