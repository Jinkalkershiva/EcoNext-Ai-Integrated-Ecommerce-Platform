package com.econext.order.service;

import com.econext.order.dto.*;
import com.econext.order.entity.OperationalOrder;
import com.econext.order.entity.OrderStatus;
import com.econext.order.entity.OrderStatusTransition;
import com.econext.order.exception.GlobalExceptionHandler.BadRequestException;
import com.econext.order.exception.GlobalExceptionHandler.ResourceNotFoundException;
import com.econext.order.repository.OperationalOrderRepository;
import com.econext.order.repository.OrderStatusTransitionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class OperationalOrderService {

    private final OperationalOrderRepository orderRepository;
    private final OrderStatusTransitionRepository transitionRepository;
    private final DjangoOrderSyncService djangoOrderSyncService;

    // Valid state transitions graph
    private static final Map<OrderStatus, Set<OrderStatus>> VALID_TRANSITIONS = Map.ofEntries(
            Map.entry(OrderStatus.ORDER_PLACED, Set.of(OrderStatus.ORDER_CONFIRMED, OrderStatus.CANCELLED)),
            Map.entry(OrderStatus.ORDER_CONFIRMED, Set.of(OrderStatus.PROCESSING, OrderStatus.CANCELLED)),
            Map.entry(OrderStatus.PROCESSING, Set.of(OrderStatus.PACKED, OrderStatus.CANCELLED)),
            Map.entry(OrderStatus.PACKED, Set.of(OrderStatus.SHIPPED, OrderStatus.CANCELLED)),
            Map.entry(OrderStatus.SHIPPED, Set.of(OrderStatus.IN_TRANSIT, OrderStatus.CANCELLED)),
            Map.entry(OrderStatus.IN_TRANSIT, Set.of(OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED)),
            Map.entry(OrderStatus.OUT_FOR_DELIVERY, Set.of(OrderStatus.DELIVERED, OrderStatus.CANCELLED)),
            Map.entry(OrderStatus.DELIVERED, Set.of(OrderStatus.RETURN_REQUESTED)),
            Map.entry(OrderStatus.RETURN_REQUESTED, Set.of(OrderStatus.RETURNED)),
            Map.entry(OrderStatus.CANCELLED, Set.of()),
            Map.entry(OrderStatus.RETURNED, Set.of())
    );

    @Transactional(readOnly = true)
    public Page<OrderResponse> searchOrders(
            OrderStatus status,
            String search,
            LocalDateTime fromTime,
            LocalDateTime toTime,
            Pageable pageable
    ) {
        return orderRepository.searchOrders(status, search, fromTime, toTime, pageable)
                .map(this::mapOrderToResponse);
    }

    @Transactional(readOnly = true)
    public OrderResponse getOrderById(Long id) {
        OperationalOrder order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + id));
        return mapOrderToResponse(order);
    }

    @Transactional
    public OrderResponse updateOrderStatus(Long orderId, OrderStatusUpdateRequest request, Long staffId, String staffUsername) {
        OperationalOrder order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + orderId));

        OrderStatus currentStatus = order.getCurrentStatus();
        OrderStatus targetStatus = request.getNewStatus();

        if (currentStatus == targetStatus) {
            return mapOrderToResponse(order);
        }

        // Validate state transition
        Set<OrderStatus> allowed = VALID_TRANSITIONS.getOrDefault(currentStatus, Collections.emptySet());
        if (!allowed.contains(targetStatus)) {
            throw new BadRequestException("Invalid order transition from '" + currentStatus + "' to '" + targetStatus +
                    "'. Allowed target states: " + allowed);
        }

        order.setCurrentStatus(targetStatus);
        if (request.getCarrierName() != null && !request.getCarrierName().isBlank()) {
            order.setCarrierName(request.getCarrierName());
        }
        if (request.getTrackingNumber() != null && !request.getTrackingNumber().isBlank()) {
            order.setTrackingNumber(request.getTrackingNumber());
        }
        OperationalOrder updated = orderRepository.save(order);

        // Record transition audit history
        OrderStatusTransition transition = OrderStatusTransition.builder()
                .orderId(order.getId())
                .fromStatus(currentStatus)
                .toStatus(targetStatus)
                .reasonNote(request.getReasonNote())
                .staffId(staffId)
                .staffUsername(staffUsername != null ? staffUsername : "SYSTEM")
                .build();
        transitionRepository.save(transition);

        // Sync with Django order state so User Panel live tracking updates immediately
        djangoOrderSyncService.syncOrderStatusToDjango(order.getDjangoOrderId() != null ? order.getDjangoOrderId() : order.getId(), targetStatus);

        return mapOrderToResponse(updated);
    }

    @Transactional(readOnly = true)
    public OrderSummaryResponse getOrderSummary() {
        long total = orderRepository.count();
        BigDecimal totalRev = orderRepository.sumTotalRevenue();
        BigDecimal delivRev = orderRepository.sumDeliveredRevenue();

        Map<String, Long> statusMap = new HashMap<>();
        List<Object[]> rows = orderRepository.countOrdersByStatus();
        for (Object[] row : rows) {
            if (row[0] != null) {
                statusMap.put(((OrderStatus) row[0]).name(), ((Number) row[1]).longValue());
            }
        }

        return OrderSummaryResponse.builder()
                .totalOrders(total)
                .pendingOrders(statusMap.getOrDefault(OrderStatus.ORDER_PLACED.name(), 0L))
                .confirmedOrders(statusMap.getOrDefault(OrderStatus.ORDER_CONFIRMED.name(), 0L))
                .processingOrders(statusMap.getOrDefault(OrderStatus.PROCESSING.name(), 0L) + statusMap.getOrDefault(OrderStatus.PACKED.name(), 0L))
                .shippedOrders(statusMap.getOrDefault(OrderStatus.SHIPPED.name(), 0L) + statusMap.getOrDefault(OrderStatus.IN_TRANSIT.name(), 0L) + statusMap.getOrDefault(OrderStatus.OUT_FOR_DELIVERY.name(), 0L))
                .deliveredOrders(statusMap.getOrDefault(OrderStatus.DELIVERED.name(), 0L))
                .cancelledOrders(statusMap.getOrDefault(OrderStatus.CANCELLED.name(), 0L))
                .totalRevenue(totalRev != null ? totalRev : BigDecimal.ZERO)
                .deliveredRevenue(delivRev != null ? delivRev : BigDecimal.ZERO)
                .statusCounts(statusMap)
                .build();
    }

    @Transactional(readOnly = true)
    public List<OrderStatusTransitionResponse> getOrderTimeline(Long orderId) {
        return transitionRepository.findByOrderIdOrderByTimestampAsc(orderId).stream()
                .map(this::mapTransitionToResponse)
                .collect(Collectors.toList());
    }

    private OrderResponse mapOrderToResponse(OperationalOrder order) {
        List<OrderItemResponse> itemResponses = order.getItems() != null ? order.getItems().stream()
                .map(item -> OrderItemResponse.builder()
                        .id(item.getId())
                        .productId(item.getProductId())
                        .productName(item.getProductName())
                        .quantity(item.getQuantity())
                        .priceAtPurchase(item.getPriceAtPurchase())
                        .subtotal(item.getSubtotal())
                        .build())
                .collect(Collectors.toList()) : new ArrayList<>();

        List<OrderStatusTransitionResponse> timeline = transitionRepository.findByOrderIdOrderByTimestampAsc(order.getId()).stream()
                .map(this::mapTransitionToResponse)
                .collect(Collectors.toList());

        return OrderResponse.builder()
                .id(order.getId())
                .customerId(order.getCustomerId())
                .customerUsername(order.getCustomerUsername())
                .customerEmail(order.getCustomerEmail())
                .customerName(order.getCustomerName())
                .totalAmount(order.getTotalAmount())
                .shippingAddress(order.getShippingAddress())
                .city(order.getCity())
                .state(order.getState())
                .zipcode(order.getZipcode())
                .country(order.getCountry())
                .currentStatus(order.getCurrentStatus())
                .carrierName(order.getCarrierName())
                .trackingNumber(order.getTrackingNumber())
                .djangoOrderId(order.getDjangoOrderId())
                .items(itemResponses)
                .timeline(timeline)
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .build();
    }

    private OrderStatusTransitionResponse mapTransitionToResponse(OrderStatusTransition t) {
        return OrderStatusTransitionResponse.builder()
                .id(t.getId())
                .orderId(t.getOrderId())
                .fromStatus(t.getFromStatus())
                .toStatus(t.getToStatus())
                .reasonNote(t.getReasonNote())
                .staffId(t.getStaffId())
                .staffUsername(t.getStaffUsername())
                .timestamp(t.getTimestamp())
                .build();
    }
}
