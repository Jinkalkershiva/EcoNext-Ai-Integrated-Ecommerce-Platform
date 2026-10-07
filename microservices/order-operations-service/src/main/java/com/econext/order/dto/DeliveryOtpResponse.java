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
public class DeliveryOtpResponse {
    private Long shipmentId;
    private Long orderId;
    private String shipmentNumber;
    private String customerEmail;
    private String customerPhone;
    private String maskedEmail;
    private String maskedPhone;
    private String status;
    private long expiresInSeconds;
    private String message;
    private String plainOtpForDev;
    private boolean verified;
    private LocalDateTime generatedAt;
}
