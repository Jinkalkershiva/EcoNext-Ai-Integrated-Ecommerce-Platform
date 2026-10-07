package com.econext.order.dto;

import com.econext.order.entity.OrderStatus;
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
public class OrderReturnResponse {

    private Long id;
    private Long orderId;
    private Long orderItemId;
    private Long customerId;
    private String customerUsername;
    private String customerEmail;
    private String reason;
    private String conditionNote;
    private OrderStatus status;
    private String rejectionReason;
    private String refundId;
    private BigDecimal refundAmount;
    private LocalDateTime requestedAt;
    private LocalDateTime inspectedAt;
    private String inspectedBy;
    private LocalDateTime receivedAt;
    private LocalDateTime createdAt;
}
