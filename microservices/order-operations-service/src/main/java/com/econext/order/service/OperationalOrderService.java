package com.econext.order.service;

import com.econext.order.dto.*;
import com.econext.order.entity.*;
import com.econext.order.exception.GlobalExceptionHandler.BadRequestException;
import com.econext.order.exception.GlobalExceptionHandler.ResourceNotFoundException;
import com.econext.order.repository.*;
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
    private final OrderReturnRequestRepository returnRequestRepository;
    private final DeliveryVerificationAuditRepository deliveryVerificationAuditRepository;
    private final DjangoOrderSyncService djangoOrderSyncService;

    // Comprehensive canonical lifecycle transitions graph
    private static final Map<OrderStatus, Set<OrderStatus>> VALID_TRANSITIONS = Map.ofEntries(
            Map.entry(OrderStatus.ORDER_PLACED, Set.of(OrderStatus.ORDER_CONFIRMED, OrderStatus.CANCEL_REQUESTED, OrderStatus.CANCELLED)),
            Map.entry(OrderStatus.ORDER_CONFIRMED, Set.of(OrderStatus.PROCESSING, OrderStatus.PACKED, OrderStatus.CANCEL_REQUESTED, OrderStatus.CANCELLED)),
            Map.entry(OrderStatus.PROCESSING, Set.of(OrderStatus.PACKED, OrderStatus.CANCEL_REQUESTED, OrderStatus.CANCELLED)),
            Map.entry(OrderStatus.PACKED, Set.of(OrderStatus.READY_FOR_SHIPMENT, OrderStatus.ASSIGNED_TO_SHIPMENT, OrderStatus.SHIPPED, OrderStatus.CANCELLED)),
            Map.entry(OrderStatus.READY_FOR_SHIPMENT, Set.of(OrderStatus.ASSIGNED_TO_SHIPMENT, OrderStatus.IN_TRANSIT, OrderStatus.CANCELLED)),
            Map.entry(OrderStatus.ASSIGNED_TO_SHIPMENT, Set.of(OrderStatus.IN_TRANSIT, OrderStatus.READY_FOR_SHIPMENT, OrderStatus.CANCELLED)),
            Map.entry(OrderStatus.SHIPPED, Set.of(OrderStatus.IN_TRANSIT, OrderStatus.CANCELLED)),
            Map.entry(OrderStatus.IN_TRANSIT, Set.of(OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED)),
            Map.entry(OrderStatus.OUT_FOR_DELIVERY, Set.of(OrderStatus.DELIVERY_VERIFICATION_STARTED, OrderStatus.DELIVERY_VERIFIED, OrderStatus.DELIVERED, OrderStatus.CANCELLED)),
            Map.entry(OrderStatus.DELIVERY_VERIFICATION_STARTED, Set.of(OrderStatus.DELIVERY_VERIFIED, OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED)),
            Map.entry(OrderStatus.DELIVERY_VERIFIED, Set.of(OrderStatus.DELIVERED)),
            Map.entry(OrderStatus.DELIVERED, Set.of(OrderStatus.RETURN_REQUESTED)),
            Map.entry(OrderStatus.CANCEL_REQUESTED, Set.of(OrderStatus.CANCELLED, OrderStatus.ORDER_CONFIRMED)),
            Map.entry(OrderStatus.RETURN_REQUESTED, Set.of(OrderStatus.INSPECTION_REQUIRED, OrderStatus.RETURN_APPROVED, OrderStatus.RETURN_REJECTED)),
            Map.entry(OrderStatus.INSPECTION_REQUIRED, Set.of(OrderStatus.RETURN_APPROVED, OrderStatus.RETURN_REJECTED)),
            Map.entry(OrderStatus.RETURN_APPROVED, Set.of(OrderStatus.RETURN_IN_TRANSIT, OrderStatus.RETURN_RECEIVED)),
            Map.entry(OrderStatus.RETURN_IN_TRANSIT, Set.of(OrderStatus.RETURN_RECEIVED)),
            Map.entry(OrderStatus.RETURN_RECEIVED, Set.of(OrderStatus.INSPECTION_PASSED, OrderStatus.RETURN_REJECTED, OrderStatus.REFUND_PENDING, OrderStatus.RETURNED)),
            Map.entry(OrderStatus.INSPECTION_PASSED, Set.of(OrderStatus.REFUND_PENDING, OrderStatus.REFUND_PROCESSING, OrderStatus.REFUNDED, OrderStatus.RETURNED)),
            Map.entry(OrderStatus.REFUND_PENDING, Set.of(OrderStatus.REFUND_PROCESSING, OrderStatus.REFUNDED, OrderStatus.RETURNED)),
            Map.entry(OrderStatus.REFUND_PROCESSING, Set.of(OrderStatus.REFUNDED, OrderStatus.RETURNED)),
            Map.entry(OrderStatus.REFUNDED, Set.of(OrderStatus.RETURNED)),
            Map.entry(OrderStatus.CANCELLED, Set.of()),
            Map.entry(OrderStatus.RETURN_REJECTED, Set.of()),
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

        // Security check: cannot manually mark OUT_FOR_DELIVERY -> DELIVERED without OTP
        if (currentStatus == OrderStatus.OUT_FOR_DELIVERY && targetStatus == OrderStatus.DELIVERED) {
            throw new BadRequestException("Direct transition to DELIVERED is forbidden. Secure Customer Delivery OTP verification is required.");
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

    @Transactional
    public OrderResponse cancelOrder(Long orderId, String cancellationReason, Long customerId, String customerUsername) {
        OperationalOrder order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + orderId));

        OrderStatus current = order.getCurrentStatus();
        if (current == OrderStatus.DELIVERED || current == OrderStatus.OUT_FOR_DELIVERY || current == OrderStatus.CANCELLED || current == OrderStatus.RETURNED) {
            throw new BadRequestException("Order cannot be cancelled in status " + current);
        }

        order.setCurrentStatus(OrderStatus.CANCELLED);
        order.setCancellationReason(cancellationReason != null ? cancellationReason : "Customer requested cancellation before dispatch");
        order.setRefundStatus("REFUND_PENDING");
        OperationalOrder saved = orderRepository.save(order);

        OrderStatusTransition transition = OrderStatusTransition.builder()
                .orderId(saved.getId())
                .fromStatus(current)
                .toStatus(OrderStatus.CANCELLED)
                .reasonNote("Order cancelled by " + (customerUsername != null ? customerUsername : "User") + ". Reason: " + order.getCancellationReason())
                .staffId(customerId)
                .staffUsername(customerUsername != null ? customerUsername : "CUSTOMER")
                .build();
        transitionRepository.save(transition);

        djangoOrderSyncService.syncOrderStatusToDjango(order.getDjangoOrderId() != null ? order.getDjangoOrderId() : order.getId(), OrderStatus.CANCELLED);

        return mapOrderToResponse(saved);
    }

    // ==========================================
    // Return & Inspection Operations
    // ==========================================

    @Transactional
    public OrderReturnResponse createReturnRequest(CreateOrderReturnRequest request, Long customerId, String customerUsername) {
        OperationalOrder order = orderRepository.findById(request.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + request.getOrderId()));

        if (order.getCurrentStatus() != OrderStatus.DELIVERED) {
            throw new BadRequestException("Return can only be requested for DELIVERED orders. Current status: " + order.getCurrentStatus());
        }

        // Return policy validation: Check snapshotted items return eligibility and window
        boolean anyEligible = false;
        if (order.getItems() != null && !order.getItems().isEmpty()) {
            for (OperationalOrderItem item : order.getItems()) {
                if (Boolean.TRUE.equals(item.getReturnEligible())) {
                    anyEligible = true;
                    int window = item.getReturnWindowDays() != null ? item.getReturnWindowDays() : 7;
                    if (order.getDeliveredAt() != null && order.getDeliveredAt().plusDays(window).isBefore(LocalDateTime.now())) {
                        throw new BadRequestException("Return window of " + window + " days has expired for item " + item.getProductName());
                    }
                }
            }
        } else {
            anyEligible = true;
        }

        if (!anyEligible) {
            throw new BadRequestException("This product is marked as non-returnable as per purchase policy.");
        }

        boolean activeExists = returnRequestRepository.existsByOrderIdAndStatusIn(order.getId(),
                List.of(OrderStatus.RETURN_REQUESTED, OrderStatus.RETURN_APPROVED, OrderStatus.RETURN_IN_TRANSIT, OrderStatus.RETURN_RECEIVED));
        if (activeExists) {
            throw new BadRequestException("An active return request is already pending for this order.");
        }

        OrderReturnRequest returnReq = OrderReturnRequest.builder()
                .orderId(order.getId())
                .orderItemId(request.getOrderItemId())
                .customerId(customerId != null ? customerId : order.getCustomerId())
                .customerUsername(customerUsername != null ? customerUsername : order.getCustomerUsername())
                .customerEmail(order.getCustomerEmail())
                .reason(request.getReason())
                .conditionNote(request.getConditionNote() != null ? request.getConditionNote() : "Product in original packaging with tags intact.")
                .status(OrderStatus.RETURN_REQUESTED)
                .refundAmount(order.getTotalAmount())
                .requestedAt(LocalDateTime.now())
                .build();

        OrderReturnRequest saved = returnRequestRepository.save(returnReq);

        OrderStatus prev = order.getCurrentStatus();
        order.setCurrentStatus(OrderStatus.RETURN_REQUESTED);
        orderRepository.save(order);

        OrderStatusTransition t = OrderStatusTransition.builder()
                .orderId(order.getId())
                .fromStatus(prev)
                .toStatus(OrderStatus.RETURN_REQUESTED)
                .reasonNote("Customer initiated return: " + request.getReason())
                .staffId(customerId)
                .staffUsername(customerUsername != null ? customerUsername : "CUSTOMER")
                .build();
        transitionRepository.save(t);

        djangoOrderSyncService.syncOrderStatusToDjango(order.getDjangoOrderId() != null ? order.getDjangoOrderId() : order.getId(), OrderStatus.RETURN_REQUESTED);

        return mapReturnToResponse(saved);
    }

    @Transactional
    public OrderReturnResponse approveReturn(Long returnId, ReturnActionRequest request, Long staffId, String staffUsername) {
        OrderReturnRequest ret = returnRequestRepository.findById(returnId)
                .orElseThrow(() -> new ResourceNotFoundException("Return request not found with ID: " + returnId));

        ret.setStatus(OrderStatus.RETURN_APPROVED);
        ret.setInspectedBy(staffUsername != null ? staffUsername : "OPERATIONS_STAFF");
        ret.setInspectedAt(LocalDateTime.now());
        OrderReturnRequest saved = returnRequestRepository.save(ret);

        OperationalOrder order = orderRepository.findById(ret.getOrderId()).orElse(null);
        if (order != null) {
            OrderStatus prev = order.getCurrentStatus();
            order.setCurrentStatus(OrderStatus.RETURN_APPROVED);
            orderRepository.save(order);

            OrderStatusTransition t = OrderStatusTransition.builder()
                    .orderId(order.getId())
                    .fromStatus(prev)
                    .toStatus(OrderStatus.RETURN_APPROVED)
                    .reasonNote("Return request approved by " + staffUsername + ". " + (request != null && request.getNote() != null ? request.getNote() : ""))
                    .staffId(staffId)
                    .staffUsername(staffUsername != null ? staffUsername : "STAFF")
                    .build();
            transitionRepository.save(t);
            djangoOrderSyncService.syncOrderStatusToDjango(order.getDjangoOrderId() != null ? order.getDjangoOrderId() : order.getId(), OrderStatus.RETURN_APPROVED);
        }

        return mapReturnToResponse(saved);
    }

    @Transactional
    public OrderReturnResponse rejectReturn(Long returnId, ReturnActionRequest request, Long staffId, String staffUsername) {
        OrderReturnRequest ret = returnRequestRepository.findById(returnId)
                .orElseThrow(() -> new ResourceNotFoundException("Return request not found with ID: " + returnId));

        ret.setStatus(OrderStatus.RETURN_REJECTED);
        ret.setRejectionReason(request != null && request.getRejectionReason() != null ? request.getRejectionReason() : "Failed return criteria inspection");
        ret.setInspectedBy(staffUsername != null ? staffUsername : "OPERATIONS_STAFF");
        ret.setInspectedAt(LocalDateTime.now());
        OrderReturnRequest saved = returnRequestRepository.save(ret);

        OperationalOrder order = orderRepository.findById(ret.getOrderId()).orElse(null);
        if (order != null) {
            OrderStatus prev = order.getCurrentStatus();
            order.setCurrentStatus(OrderStatus.RETURN_REJECTED);
            orderRepository.save(order);

            OrderStatusTransition t = OrderStatusTransition.builder()
                    .orderId(order.getId())
                    .fromStatus(prev)
                    .toStatus(OrderStatus.RETURN_REJECTED)
                    .reasonNote("Return rejected by " + staffUsername + ": " + ret.getRejectionReason())
                    .staffId(staffId)
                    .staffUsername(staffUsername != null ? staffUsername : "STAFF")
                    .build();
            transitionRepository.save(t);
            djangoOrderSyncService.syncOrderStatusToDjango(order.getDjangoOrderId() != null ? order.getDjangoOrderId() : order.getId(), OrderStatus.RETURN_REJECTED);
        }

        return mapReturnToResponse(saved);
    }

    @Transactional
    public OrderReturnResponse receiveReturn(Long returnId, ReturnActionRequest request, Long staffId, String staffUsername) {
        OrderReturnRequest ret = returnRequestRepository.findById(returnId)
                .orElseThrow(() -> new ResourceNotFoundException("Return request not found with ID: " + returnId));

        ret.setStatus(OrderStatus.RETURNED);
        ret.setReceivedAt(LocalDateTime.now());
        ret.setInspectedBy(staffUsername != null ? staffUsername : "WAREHOUSE_STAFF");
        ret.setInspectedAt(LocalDateTime.now());
        OrderReturnRequest saved = returnRequestRepository.save(ret);

        OperationalOrder order = orderRepository.findById(ret.getOrderId()).orElse(null);
        if (order != null) {
            OrderStatus prev = order.getCurrentStatus();
            order.setCurrentStatus(OrderStatus.RETURNED);
            order.setRefundStatus("REFUND_COMPLETED");
            orderRepository.save(order);

            OrderStatusTransition t = OrderStatusTransition.builder()
                    .orderId(order.getId())
                    .fromStatus(prev)
                    .toStatus(OrderStatus.RETURNED)
                    .reasonNote("Return item received at warehouse hub and passed physical inspection by " + staffUsername)
                    .staffId(staffId)
                    .staffUsername(staffUsername != null ? staffUsername : "STAFF")
                    .build();
            transitionRepository.save(t);
            djangoOrderSyncService.syncOrderStatusToDjango(order.getDjangoOrderId() != null ? order.getDjangoOrderId() : order.getId(), OrderStatus.RETURNED);
        }

        return mapReturnToResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<OrderReturnResponse> getAllReturns() {
        return returnRequestRepository.findAllByOrderByRequestedAtDesc().stream()
                .map(this::mapReturnToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<OrderReturnResponse> getReturnsByOrderId(Long orderId) {
        return returnRequestRepository.findByOrderId(orderId).stream()
                .map(this::mapReturnToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<DeliveryVerificationAuditResponse> getDeliveryAudits(Long orderId) {
        return deliveryVerificationAuditRepository.findByOrderId(orderId).stream()
                .map(a -> DeliveryVerificationAuditResponse.builder()
                        .id(a.getId())
                        .orderId(a.getOrderId())
                        .shipmentId(a.getShipmentId())
                        .verifiedBy(a.getVerifiedBy())
                        .customerId(a.getCustomerId())
                        .verificationMethod(a.getVerificationMethod())
                        .verificationTimestamp(a.getVerificationTimestamp())
                        .previousOrderStatus(a.getPreviousOrderStatus())
                        .newOrderStatus(a.getNewOrderStatus())
                        .deliveryAttemptInfo(a.getDeliveryAttemptInfo())
                        .createdAt(a.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
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
                        .returnEligible(item.getReturnEligible())
                        .returnWindowDays(item.getReturnWindowDays())
                        .returnPolicy(item.getReturnPolicy())
                        .conditionRequired(item.getConditionRequired())
                        .weightKg(item.getWeightKg())
                        .volumeM3(item.getVolumeM3())
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
                .orderNumber(order.getOrderNumber())
                .orderReferenceNumber(order.getOrderReferenceNumber())
                .totalWeightKg(order.resolveWeight())
                .totalVolumeM3(order.resolveVolume())
                .deliveredAt(order.getDeliveredAt())
                .cancellationReason(order.getCancellationReason())
                .refundStatus(order.getRefundStatus())
                .items(itemResponses)
                .timeline(timeline)
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .build();
    }

    private OrderReturnResponse mapReturnToResponse(OrderReturnRequest r) {
        return OrderReturnResponse.builder()
                .id(r.getId())
                .orderId(r.getOrderId())
                .orderItemId(r.getOrderItemId())
                .customerId(r.getCustomerId())
                .customerUsername(r.getCustomerUsername())
                .customerEmail(r.getCustomerEmail())
                .reason(r.getReason())
                .conditionNote(r.getConditionNote())
                .status(r.getStatus())
                .rejectionReason(r.getRejectionReason())
                .refundId(r.getRefundId())
                .refundAmount(r.getRefundAmount())
                .requestedAt(r.getRequestedAt())
                .inspectedAt(r.getInspectedAt())
                .inspectedBy(r.getInspectedBy())
                .receivedAt(r.getReceivedAt())
                .createdAt(r.getCreatedAt())
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
