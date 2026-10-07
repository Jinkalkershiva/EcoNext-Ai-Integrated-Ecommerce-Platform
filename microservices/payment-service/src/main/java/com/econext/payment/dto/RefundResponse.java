package com.econext.payment.dto;

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
public class RefundResponse {

    private Long id;
    private String refundId;
    private Long orderId;
    private Long paymentId;
    private Long userId;
    private String razorpayPaymentId;
    private String providerRefundId;
    private BigDecimal amount;
    private String currency;
    private String status;
    private String reason;
    private String idempotencyKey;
    private String failureReason;
    private Integer retryCount;
    private LocalDateTime processedAt;
    private LocalDateTime createdAt;
}
