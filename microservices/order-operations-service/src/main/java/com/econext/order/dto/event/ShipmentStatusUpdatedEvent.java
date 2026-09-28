package com.econext.order.dto.event;

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
public class ShipmentStatusUpdatedEvent implements Serializable {

    @Builder.Default
    private String eventId = java.util.UUID.randomUUID().toString();

    @Builder.Default
    private String eventType = "SHIPMENT_STATUS_UPDATED";

    private Long shipmentId;
    private String shipmentNumber;
    private Long orderId;
    private String status;
    private String previousStatus;
    private String carrierName;
    private String trackingNumber;

    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();
}
