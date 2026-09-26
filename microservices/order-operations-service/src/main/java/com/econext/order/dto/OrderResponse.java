package com.econext.order.dto;

import com.econext.order.entity.OrderStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderResponse {
    private Long id;
    private Long customerId;
    private String customerUsername;
    private String customerEmail;
    private String customerName;
    private BigDecimal totalAmount;
    private String shippingAddress;
    private String city;
    private String state;
    private String zipcode;
    private String country;
    private OrderStatus currentStatus;
    private String carrierName;
    private String trackingNumber;
    private Long djangoOrderId;
    private List<OrderItemResponse> items;
    private List<OrderStatusTransitionResponse> timeline;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
