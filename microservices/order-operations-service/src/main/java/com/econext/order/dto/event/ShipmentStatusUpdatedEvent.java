package com.econext.order.dto.event;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
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

    private String oldStatus;
    private String newStatus;
    private String location;

    private String carrierName;
    private String trackingNumber;

    @Builder.Default
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime timestamp = LocalDateTime.now();

    // Helper getters/setters for compatibility
    public String getStatus() {
        return newStatus != null ? newStatus : "";
    }

    public void setStatus(String status) {
        this.newStatus = status;
    }

    public String getPreviousStatus() {
        return oldStatus != null ? oldStatus : "";
    }

    public void setPreviousStatus(String previousStatus) {
        this.oldStatus = previousStatus;
    }
}
