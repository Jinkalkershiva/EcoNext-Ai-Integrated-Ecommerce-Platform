package com.econext.order.dto;

import com.econext.order.entity.OrderStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderStatusTransitionResponse {
    private Long id;
    private Long orderId;
    private OrderStatus fromStatus;
    private OrderStatus toStatus;
    private String reasonNote;
    private Long staffId;
    private String staffUsername;
    private LocalDateTime timestamp;
}
