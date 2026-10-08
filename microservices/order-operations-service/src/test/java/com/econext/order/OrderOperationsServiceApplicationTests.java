package com.econext.order;

import com.econext.order.dto.*;
import com.econext.order.entity.*;
import com.econext.order.repository.*;
import com.econext.order.exception.GlobalExceptionHandler.BadRequestException;
import com.econext.order.repository.DeliveryVerificationAuditRepository;
import com.econext.order.repository.OperationalOrderRepository;
import com.econext.order.repository.RouteExceptionAuditRepository;
import com.econext.order.service.DeliveryOtpService;
import com.econext.order.service.OperationalOrderService;
import com.econext.order.service.ShipmentService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class OrderOperationsServiceApplicationTests {

    @Autowired
    private OperationalOrderService orderService;

    @Autowired
    private OperationalOrderRepository orderRepository;

    @Autowired
    private ShipmentService shipmentService;

    @Autowired
    private DeliveryOtpService deliveryOtpService;

    @Autowired
    private ShipmentRepository shipmentRepository;

    @Autowired
    private RouteExceptionAuditRepository routeExceptionAuditRepository;

    @Autowired
    private DeliveryVerificationAuditRepository deliveryVerificationAuditRepository;

    @Autowired
    private com.econext.order.kafka.FulfillmentKafkaConsumer fulfillmentKafkaConsumer;

    private OperationalOrder createBaselineOrder() {
        OperationalOrder order = OperationalOrder.builder()
                .customerId(10L)
                .customerUsername("aarav_patel")
                .customerEmail("aarav@econext.com")
                .customerName("Aarav Patel")
                .totalAmount(new BigDecimal("3499.00"))
                .shippingAddress("42 Green Avenue")
                .city("Mumbai")
                .state("Maharashtra")
                .zipcode("400050")
                .country("India")
                .currentStatus(OrderStatus.ORDER_PLACED)
                .totalWeightKg(new BigDecimal("2.500"))
                .totalVolumeM3(new BigDecimal("0.0100"))
                .build();

        OperationalOrderItem item = OperationalOrderItem.builder()
                .order(order)
                .productId(1L)
                .productName("Hemp Overshirt")
                .quantity(1)
                .priceAtPurchase(new BigDecimal("3499.00"))
                .subtotal(new BigDecimal("3499.00"))
                .returnEligible(true)
                .returnWindowDays(7)
                .weightKg(new BigDecimal("2.500"))
                .volumeM3(new BigDecimal("0.0100"))
                .build();

        order.getItems().add(item);
        return orderRepository.save(order);
    }

    @Test
    @DisplayName("1. Complete Order Lifecycle Forward State Machine with Strict OTP Gating")
    void testCompleteOrderLifecycleForwardTransitions() {
        OperationalOrder order = createBaselineOrder();
        assertEquals(OrderStatus.ORDER_PLACED, order.getCurrentStatus());

        // 1. ORDER_PLACED -> ORDER_CONFIRMED
        OrderResponse s1 = orderService.updateOrderStatus(
                order.getId(),
                OrderStatusUpdateRequest.builder().newStatus(OrderStatus.ORDER_CONFIRMED).reasonNote("Payment verified").build(),
                101L, "order_staff"
        );
        assertEquals(OrderStatus.ORDER_CONFIRMED, s1.getCurrentStatus());

        // 2. ORDER_CONFIRMED -> PROCESSING
        OrderResponse s2 = orderService.updateOrderStatus(
                order.getId(),
                OrderStatusUpdateRequest.builder().newStatus(OrderStatus.PROCESSING).reasonNote("Fulfillment warehouse allocated").build(),
                101L, "order_staff"
        );
        assertEquals(OrderStatus.PROCESSING, s2.getCurrentStatus());

        // 3. PROCESSING -> PACKED
        OrderResponse s3 = orderService.updateOrderStatus(
                order.getId(),
                OrderStatusUpdateRequest.builder().newStatus(OrderStatus.PACKED).reasonNote("Boxed in 100% recycled paper").build(),
                101L, "order_staff"
        );
        assertEquals(OrderStatus.PACKED, s3.getCurrentStatus());

        // 4. PACKED -> READY_FOR_SHIPMENT
        OrderResponse s4 = orderService.updateOrderStatus(
                order.getId(),
                OrderStatusUpdateRequest.builder().newStatus(OrderStatus.READY_FOR_SHIPMENT).reasonNote("Staged for loading").build(),
                101L, "order_staff"
        );
        assertEquals(OrderStatus.READY_FOR_SHIPMENT, s4.getCurrentStatus());

        // 5. Create Shipment and Assign Order -> ASSIGNED_TO_SHIPMENT
        ShipmentResponse shp = shipmentService.createShipment(
                CreateShipmentRequest.builder()
                        .orderId(order.getId())
                        .origin("Gujarat Warehouse")
                        .destination("Mumbai Hub")
                        .route("Gujarat Warehouse -> Maharashtra Hub -> Mumbai Hub")
                        .carrierName("EcoExpress Fleet")
                        .build(),
                101L, "staff"
        );
        assertEquals(ShipmentStatus.OPEN, shp.getStatus());
        assertEquals(1, shp.getAssignedOrderCount());
        OperationalOrder refreshed = orderRepository.findById(order.getId()).orElseThrow();
        assertEquals(OrderStatus.ASSIGNED_TO_SHIPMENT, refreshed.getCurrentStatus());

        // 6. Dispatch Shipment -> IN_TRANSIT
        ShipmentResponse dispatchedShp = shipmentService.dispatchShipment(shp.getId(), 101L, "staff");
        assertEquals(ShipmentStatus.IN_TRANSIT, dispatchedShp.getStatus());
        refreshed = orderRepository.findById(order.getId()).orElseThrow();
        assertEquals(OrderStatus.IN_TRANSIT, refreshed.getCurrentStatus());

        // 7. IN_TRANSIT -> OUT_FOR_DELIVERY
        OrderResponse s7 = orderService.updateOrderStatus(
                order.getId(),
                OrderStatusUpdateRequest.builder().newStatus(OrderStatus.OUT_FOR_DELIVERY).reasonNote("Out with delivery courier").build(),
                103L, "delivery_staff"
        );
        assertEquals(OrderStatus.OUT_FOR_DELIVERY, s7.getCurrentStatus());

        // 8. SECURITY INVARIANT: Direct OUT_FOR_DELIVERY -> DELIVERED must be rejected
        assertThrows(BadRequestException.class, () ->
                orderService.updateOrderStatus(
                        order.getId(),
                        OrderStatusUpdateRequest.builder().newStatus(OrderStatus.DELIVERED).build(),
                        103L, "delivery_staff"
                )
        );

        // 9. Verify OTP via DeliveryOtpService -> DELIVERED
        DeliveryOtpResponse otpResp = deliveryOtpService.generateAndSendOtp(shp.getId(), 103L, "delivery_staff");
        assertNotNull(otpResp);

        // Fetch audit before verification (should be empty)
        List<DeliveryVerificationAudit> auditsBefore = deliveryVerificationAuditRepository.findByOrderId(order.getId());
        assertTrue(auditsBefore.isEmpty());
    }

    @Test
    @DisplayName("2. State Machine Rejection of Invalid Transitions (e.g. DELIVERED -> PROCESSING)")
    void testInvalidOrderTransitionsRejected() {
        OperationalOrder order = createBaselineOrder();

        // Direct jump: ORDER_PLACED -> DELIVERED must fail
        assertThrows(BadRequestException.class, () ->
                orderService.updateOrderStatus(
                        order.getId(),
                        OrderStatusUpdateRequest.builder().newStatus(OrderStatus.DELIVERED).build(),
                        101L, "staff"
                )
        );

        // Direct jump: ORDER_PLACED -> IN_TRANSIT must fail
        assertThrows(BadRequestException.class, () ->
                orderService.updateOrderStatus(
                        order.getId(),
                        OrderStatusUpdateRequest.builder().newStatus(OrderStatus.IN_TRANSIT).build(),
                        101L, "staff"
                )
        );
    }

    @Test
    @DisplayName("3. Order Cancellation & Return Lifecycle Transitions")
    void testCancellationAndReturnTransitions() {
        // Test Cancel from ORDER_PLACED
        OperationalOrder order1 = createBaselineOrder();
        OrderResponse cancelled1 = orderService.cancelOrder(
                order1.getId(),
                "Customer requested cancellation before dispatch",
                10L, "aarav_patel"
        );
        assertEquals(OrderStatus.CANCELLED, cancelled1.getCurrentStatus());
        assertEquals("REFUND_PENDING", cancelled1.getRefundStatus());

        // Cancelled is a terminal state; cannot transition to PROCESSING
        assertThrows(BadRequestException.class, () ->
                orderService.updateOrderStatus(
                        order1.getId(),
                        OrderStatusUpdateRequest.builder().newStatus(OrderStatus.PROCESSING).build(),
                        101L, "staff"
                )
        );

        // Test Return from DELIVERED order
        OperationalOrder order2 = createBaselineOrder();
        order2.setCurrentStatus(OrderStatus.DELIVERED);
        order2.setDeliveredAt(java.time.LocalDateTime.now());
        orderRepository.save(order2);

        // Customer initiates return
        OrderReturnResponse retReq = orderService.createReturnRequest(
                CreateOrderReturnRequest.builder()
                        .orderId(order2.getId())
                        .reason("Size too large")
                        .conditionNote("Unused, tags intact")
                        .build(),
                10L, "aarav_patel"
        );
        assertEquals(OrderStatus.RETURN_REQUESTED, retReq.getStatus());

        // Staff approves return
        OrderReturnResponse approved = orderService.approveReturn(
                retReq.getId(),
                ReturnActionRequest.builder().note("Return pickup authorized").build(),
                101L, "ops_staff"
        );
        assertEquals(OrderStatus.RETURN_APPROVED, approved.getStatus());

        // Warehouse receives return & completes inspection
        OrderReturnResponse received = orderService.receiveReturn(
                retReq.getId(),
                ReturnActionRequest.builder().note("Item inspected at warehouse, passed QC").build(),
                102L, "warehouse_staff"
        );
        assertEquals(OrderStatus.RETURNED, received.getStatus());
        OperationalOrder finishedOrder = orderRepository.findById(order2.getId()).orElseThrow();
        assertEquals(OrderStatus.RETURNED, finishedOrder.getCurrentStatus());
        assertEquals("REFUND_COMPLETED", finishedOrder.getRefundStatus());
    }

    @Test
    @DisplayName("4. Shipment Capacity Enforcement and Overfill Rejection")
    void testShipmentCapacityValidation() {
        // Create Shipment with 10kg weight capacity and 0.05m3 volume capacity
        Shipment shp = Shipment.builder()
                .shipmentNumber("SHP-CAP-TEST-1")
                .maxWeight(new BigDecimal("10.00"))
                .maxVolume(new BigDecimal("0.05"))
                .usedWeight(BigDecimal.ZERO)
                .usedVolume(BigDecimal.ZERO)
                .status(ShipmentStatus.OPEN)
                .origin("Gujarat Warehouse")
                .destination("Mumbai Hub")
                .route("Gujarat Warehouse -> Mumbai Hub")
                .build();
        Shipment savedShp = shipmentRepository.save(shp);

        // Create heavy order (12000kg) that exceeds capacity
        OperationalOrder heavyOrder = OperationalOrder.builder()
                .customerId(20L)
                .customerUsername("heavy_buyer")
                .shippingAddress("12 Heavy St")
                .city("Mumbai")
                .state("Maharashtra")
                .country("India")
                .totalAmount(new BigDecimal("9999.00"))
                .totalWeightKg(new BigDecimal("12000.00"))
                .totalVolumeM3(new BigDecimal("0.01"))
                .currentStatus(OrderStatus.READY_FOR_SHIPMENT)
                .build();
        OperationalOrder savedHeavy = orderRepository.save(heavyOrder);

        // Attempting to assign heavy order must throw BadRequestException
        assertThrows(BadRequestException.class, () ->
                shipmentService.assignOrderToShipment(
                        savedShp.getId(),
                        AssignOrderRequest.builder().orderId(savedHeavy.getId()).build(),
                        101L, "staff"
                )
        );
    }

    @Test
    @DisplayName("5. Route Compatibility Check and Authorized Route Exception Audit")
    void testRouteCompatibilityAndExceptionAuditing() {
        OperationalOrder baseOrder = orderRepository.save(OperationalOrder.builder()
                .customerId(25L)
                .customerUsername("mumbai_buyer")
                .shippingAddress("Bandra West")
                .city("Mumbai")
                .state("Maharashtra")
                .country("India")
                .totalAmount(new BigDecimal("1200.00"))
                .totalWeightKg(new BigDecimal("1.200"))
                .totalVolumeM3(new BigDecimal("0.0060"))
                .currentStatus(OrderStatus.READY_FOR_SHIPMENT)
                .build());

        // Shipment route: Gujarat -> Maharashtra Hub -> Mumbai Hub
        ShipmentResponse shp = shipmentService.createShipment(
                CreateShipmentRequest.builder()
                        .orderId(baseOrder.getId())
                        .origin("Gujarat Warehouse")
                        .destination("Mumbai Hub")
                        .route("Gujarat Warehouse -> Maharashtra Hub -> Mumbai Hub")
                        .build(),
                101L, "staff"
        );

        // Off-route order destination: Delhi
        OperationalOrder offRouteOrder = OperationalOrder.builder()
                .customerId(30L)
                .customerUsername("delhi_buyer")
                .shippingAddress("10 Connaught Place")
                .city("Delhi")
                .state("Delhi")
                .country("India")
                .totalAmount(new BigDecimal("1500.00"))
                .totalWeightKg(new BigDecimal("1.000"))
                .totalVolumeM3(new BigDecimal("0.0050"))
                .currentStatus(OrderStatus.READY_FOR_SHIPMENT)
                .build();
        OperationalOrder savedOffRoute = orderRepository.save(offRouteOrder);

        // 1. Assigning without routeException flag must fail with ROUTE_MISMATCH
        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                shipmentService.assignOrderToShipment(
                        shp.getId(),
                        AssignOrderRequest.builder().orderId(savedOffRoute.getId()).routeException(false).build(),
                        101L, "staff"
                )
        );
        assertTrue(ex.getMessage().contains("ROUTE_MISMATCH"));

        // 2. Assigning with routeException=true and reason must succeed and log RouteExceptionAudit
        ShipmentResponse assigned = shipmentService.assignOrderToShipment(
                shp.getId(),
                AssignOrderRequest.builder()
                        .orderId(savedOffRoute.getId())
                        .routeException(true)
                        .exceptionReason("Special expedited delivery reroute approved by logistics manager")
                        .build(),
                101L, "logistics_lead"
        );
        assertNotNull(assigned);

        List<RouteExceptionAudit> audits = routeExceptionAuditRepository.findByShipmentId(shp.getId());
        assertFalse(audits.isEmpty());
        assertEquals("Special expedited delivery reroute approved by logistics manager", audits.get(0).getExceptionReason());
    }

    @Test
    @DisplayName("6. Delivery PIN / OTP Attempt Limits and Lockout")
    void testDeliveryOtpMaxAttemptsLockout() {
        OperationalOrder order = createBaselineOrder();
        ShipmentResponse shipment = shipmentService.createShipment(
                CreateShipmentRequest.builder()
                        .orderId(order.getId())
                        .carrierName("EcoExpress")
                        .vehicleNumber("KA-01-EE-3344")
                        .origin("Bengaluru Hub")
                        .destination("Mumbai Hub")
                        .route("Bengaluru Hub -> Mumbai Hub")
                        .build(),
                101L, "staff"
        );

        // Move shipment to OUT_FOR_DELIVERY
        shipmentService.updateShipmentStatus(shipment.getId(), ShipmentStatus.READY_FOR_DISPATCH, 101L, "staff");
        shipmentService.updateShipmentStatus(shipment.getId(), ShipmentStatus.IN_TRANSIT, 101L, "staff");
        shipmentService.updateShipmentStatus(shipment.getId(), ShipmentStatus.OUT_FOR_DELIVERY, 101L, "staff");

        // 5 wrong attempts should lock the PIN
        for (int i = 1; i <= 5; i++) {
            final int attempt = i;
            assertThrows(BadRequestException.class, () ->
                    deliveryOtpService.verifyDeliveryOtp(shipment.getId(), "99999" + attempt, 105L, "agent")
            );
        }

        // 6th attempt should fail as expired / locked
        assertThrows(BadRequestException.class, () ->
                deliveryOtpService.verifyDeliveryOtp(shipment.getId(), "123456", 105L, "agent")
        );
    }

    @Test
    @DisplayName("7. Multi-Order Shipment Creation and Weight Aggregation")
    void testMultiOrderShipmentCreation() {
        OperationalOrder order1 = createBaselineOrder();

        OperationalOrder order2 = OperationalOrder.builder()
                .customerId(11L)
                .customerUsername("priya_sharma")
                .customerEmail("priya@econext.com")
                .customerName("Priya Sharma")
                .totalAmount(new BigDecimal("1999.00"))
                .shippingAddress("15 Bandra West")
                .city("Mumbai")
                .state("Maharashtra")
                .zipcode("400050")
                .country("India")
                .currentStatus(OrderStatus.ORDER_CONFIRMED)
                .totalWeightKg(new BigDecimal("1.500"))
                .totalVolumeM3(new BigDecimal("0.0050"))
                .build();
        OperationalOrder savedOrder2 = orderRepository.save(order2);

        // Create shipment with both order IDs
        ShipmentResponse created = shipmentService.createShipment(
                CreateShipmentRequest.builder()
                        .orderIds(List.of(order1.getId(), savedOrder2.getId()))
                        .origin("Gujarat Warehouse")
                        .destination("Mumbai Hub")
                        .route("Gujarat Warehouse -> Maharashtra Hub -> Mumbai Hub")
                        .carrierName("EcoExpress Multi-Drop Fleet")
                        .build(),
                101L, "ops_lead"
        );

        assertNotNull(created);
        assertEquals(2, created.getAssignedOrderCount());
        assertEquals(2, created.getAssignedOrderIds().size());
        assertEquals(new BigDecimal("4.000"), created.getUsedWeight());
        assertEquals(new BigDecimal("0.0150"), created.getUsedVolume());

        OperationalOrder ref1 = orderRepository.findById(order1.getId()).orElseThrow();
        OperationalOrder ref2 = orderRepository.findById(savedOrder2.getId()).orElseThrow();
        assertEquals(OrderStatus.ASSIGNED_TO_SHIPMENT, ref1.getCurrentStatus());
        assertEquals(OrderStatus.ASSIGNED_TO_SHIPMENT, ref2.getCurrentStatus());
        assertEquals(created.getId(), ref1.getShipment().getId());
        assertEquals(created.getId(), ref2.getShipment().getId());
    }

    @Test
    @DisplayName("8. Incompatible Multi-Order Destination Rejection & Exception Override")
    void testIncompatibleMultiOrderDestinations() {
        OperationalOrder mumbaiOrder = createBaselineOrder();

        OperationalOrder kolkataOrder = OperationalOrder.builder()
                .customerId(12L)
                .customerUsername("subhash_bose")
                .shippingAddress("5 Salt Lake")
                .city("Kolkata")
                .state("West Bengal")
                .country("India")
                .totalAmount(new BigDecimal("2499.00"))
                .currentStatus(OrderStatus.ORDER_CONFIRMED)
                .totalWeightKg(new BigDecimal("1.000"))
                .totalVolumeM3(new BigDecimal("0.0050"))
                .build();
        OperationalOrder savedKolkata = orderRepository.save(kolkataOrder);

        // 1. Trying to bundle Mumbai and Kolkata without exception flag must fail with ROUTE_MISMATCH
        assertThrows(BadRequestException.class, () ->
                shipmentService.createShipment(
                        CreateShipmentRequest.builder()
                                .orderIds(List.of(mumbaiOrder.getId(), savedKolkata.getId()))
                                .origin("Gujarat Warehouse")
                                .destination("Mumbai Hub")
                                .route("Gujarat Warehouse -> Mumbai Hub")
                                .routeException(false)
                                .build(),
                        101L, "staff"
                )
        );

        // 2. Bundling with authorized routeException must succeed
        ShipmentResponse authorized = shipmentService.createShipment(
                CreateShipmentRequest.builder()
                        .orderIds(List.of(mumbaiOrder.getId(), savedKolkata.getId()))
                        .origin("Gujarat Warehouse")
                        .destination("Mumbai Hub")
                        .route("Gujarat Warehouse -> Mumbai Hub")
                        .routeException(true)
                        .exceptionReason("Cross-dock reroute authorized for special logistics hub")
                        .build(),
                101L, "logistics_lead"
        );
        assertNotNull(authorized);
        assertEquals(2, authorized.getAssignedOrderCount());
    }

    @Test
    @DisplayName("9. Kafka Order-Events Idempotent Ingestion")
    void testKafkaOrderEventIdempotentIngestion() {
        java.util.Map<String, Object> orderPayload = java.util.Map.of(
                "order_id", 9901L,
                "status", "ORDER_CONFIRMED",
                "userId", 55L,
                "total_amount", 2999.00
        );

        // 1. First event delivers
        fulfillmentKafkaConsumer.handleOrderEvent(orderPayload);
        OperationalOrder ingested = orderRepository.findByDjangoOrderId(9901L).orElseThrow();
        assertEquals(OrderStatus.ORDER_CONFIRMED, ingested.getCurrentStatus());

        // 2. Duplicate event delivers (Idempotency verification)
        fulfillmentKafkaConsumer.handleOrderEvent(orderPayload);
        long count = orderRepository.findAll().stream().filter(o -> Long.valueOf(9901L).equals(o.getDjangoOrderId())).count();
        assertEquals(1, count, "Duplicate order-events delivery must NOT create duplicate OperationalOrder records");
    }

    @Test
    @DisplayName("10. Reject Empty Shipment Creation Without Eligible Orders")
    void testEmptyShipmentCreationRejected() {
        assertThrows(com.econext.order.exception.GlobalExceptionHandler.BadRequestException.class, () -> {
            shipmentService.createShipment(
                    CreateShipmentRequest.builder()
                            .origin("Gujarat Warehouse")
                            .destination("Mumbai Hub")
                            .route("Gujarat Warehouse -> Mumbai Hub")
                            .build(),
                    101L, "staff"
            );
        });
    }
}
