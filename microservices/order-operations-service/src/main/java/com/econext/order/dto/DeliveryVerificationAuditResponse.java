package com.econext.order.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeliveryVerificationAuditResponse {

    private Long id;
    private Long orderId;
    private Long shipmentId;
    private String verifiedBy;
    private Long customerId;
    private String verificationMethod;
    private LocalDateTime verificationTimestamp;
    private String previousOrderStatus;
    private String newOrderStatus;
    private String deliveryAttemptInfo;
    private LocalDateTime createdAt;
}
