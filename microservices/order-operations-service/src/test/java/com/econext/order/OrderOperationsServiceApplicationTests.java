package com.econext.order;

import com.econext.order.dto.OrderResponse;
import com.econext.order.dto.OrderStatusUpdateRequest;
import com.econext.order.entity.OperationalOrder;
import com.econext.order.entity.OperationalOrderItem;
import com.econext.order.entity.OrderStatus;
import com.econext.order.exception.GlobalExceptionHandler.BadRequestException;
import com.econext.order.repository.OperationalOrderRepository;
import com.econext.order.service.OperationalOrderService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class OrderOperationsServiceApplicationTests {

    @Autowired
    private OperationalOrderService orderService;

    @Autowired
    private OperationalOrderRepository orderRepository;

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
                .build();

        OperationalOrderItem item = OperationalOrderItem.builder()
                .order(order)
                .productId(1L)
                .productName("Hemp Overshirt")
                .quantity(1)
                .priceAtPurchase(new BigDecimal("3499.00"))
                .subtotal(new BigDecimal("3499.00"))
                .build();

        order.getItems().add(item);
        return orderRepository.save(order);
    }

    @Test
    @DisplayName("1. Complete 10-Stage Order Lifecycle Forward State Machine")
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

        // 4. PACKED -> SHIPPED
        OrderResponse s4 = orderService.updateOrderStatus(
                order.getId(),
                OrderStatusUpdateRequest.builder().newStatus(OrderStatus.SHIPPED).carrierName("EcoExpress").trackingNumber("ECO-998811").reasonNote("Handed to courier").build(),
                102L, "logistics_staff"
        );
        assertEquals(OrderStatus.SHIPPED, s4.getCurrentStatus());
        assertEquals("ECO-998811", s4.getTrackingNumber());

        // 5. SHIPPED -> IN_TRANSIT
        OrderResponse s5 = orderService.updateOrderStatus(
                order.getId(),
                OrderStatusUpdateRequest.builder().newStatus(OrderStatus.IN_TRANSIT).reasonNote("Arrived at regional hub").build(),
                102L, "logistics_staff"
        );
        assertEquals(OrderStatus.IN_TRANSIT, s5.getCurrentStatus());

        // 6. IN_TRANSIT -> OUT_FOR_DELIVERY
        OrderResponse s6 = orderService.updateOrderStatus(
                order.getId(),
                OrderStatusUpdateRequest.builder().newStatus(OrderStatus.OUT_FOR_DELIVERY).reasonNote("Out with delivery associate").build(),
                103L, "delivery_staff"
        );
        assertEquals(OrderStatus.OUT_FOR_DELIVERY, s6.getCurrentStatus());

        // 7. OUT_FOR_DELIVERY -> DELIVERED
        OrderResponse s7 = orderService.updateOrderStatus(
                order.getId(),
                OrderStatusUpdateRequest.builder().newStatus(OrderStatus.DELIVERED).reasonNote("Delivered with signature").build(),
                103L, "delivery_staff"
        );
        assertEquals(OrderStatus.DELIVERED, s7.getCurrentStatus());
        assertEquals(7, s7.getTimeline().size(), "All 7 historical status transitions must be logged in timeline");
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

        // Move to CONFIRMED -> PROCESSING -> PACKED -> SHIPPED -> IN_TRANSIT -> OUT_FOR_DELIVERY -> DELIVERED
        orderService.updateOrderStatus(order.getId(), OrderStatusUpdateRequest.builder().newStatus(OrderStatus.ORDER_CONFIRMED).build(), 101L, "staff");
        orderService.updateOrderStatus(order.getId(), OrderStatusUpdateRequest.builder().newStatus(OrderStatus.PROCESSING).build(), 101L, "staff");
        orderService.updateOrderStatus(order.getId(), OrderStatusUpdateRequest.builder().newStatus(OrderStatus.PACKED).build(), 101L, "staff");
        orderService.updateOrderStatus(order.getId(), OrderStatusUpdateRequest.builder().newStatus(OrderStatus.SHIPPED).build(), 101L, "staff");
        orderService.updateOrderStatus(order.getId(), OrderStatusUpdateRequest.builder().newStatus(OrderStatus.IN_TRANSIT).build(), 101L, "staff");
        orderService.updateOrderStatus(order.getId(), OrderStatusUpdateRequest.builder().newStatus(OrderStatus.OUT_FOR_DELIVERY).build(), 101L, "staff");
        orderService.updateOrderStatus(order.getId(), OrderStatusUpdateRequest.builder().newStatus(OrderStatus.DELIVERED).build(), 101L, "staff");

        // Backward jump: DELIVERED -> PROCESSING must fail
        assertThrows(BadRequestException.class, () ->
                orderService.updateOrderStatus(
                        order.getId(),
                        OrderStatusUpdateRequest.builder().newStatus(OrderStatus.PROCESSING).build(),
                        101L, "staff"
                )
        );
    }

    @Test
    @DisplayName("3. Order Cancellation & Return Lifecycle Transitions")
    void testCancellationAndReturnTransitions() {
        // Test Cancel from ORDER_PLACED
        OperationalOrder order1 = createBaselineOrder();
        OrderResponse cancelled1 = orderService.updateOrderStatus(
                order1.getId(),
                OrderStatusUpdateRequest.builder().newStatus(OrderStatus.CANCELLED).reasonNote("Customer request before payment").build(),
                101L, "staff"
        );
        assertEquals(OrderStatus.CANCELLED, cancelled1.getCurrentStatus());

        // Cancelled is a terminal state; cannot transition to PROCESSING
        assertThrows(BadRequestException.class, () ->
                orderService.updateOrderStatus(
                        order1.getId(),
                        OrderStatusUpdateRequest.builder().newStatus(OrderStatus.PROCESSING).build(),
                        101L, "staff"
                )
        );

        // Test Return from DELIVERED
        OperationalOrder order2 = createBaselineOrder();
        orderService.updateOrderStatus(order2.getId(), OrderStatusUpdateRequest.builder().newStatus(OrderStatus.ORDER_CONFIRMED).build(), 101L, "staff");
        orderService.updateOrderStatus(order2.getId(), OrderStatusUpdateRequest.builder().newStatus(OrderStatus.PROCESSING).build(), 101L, "staff");
        orderService.updateOrderStatus(order2.getId(), OrderStatusUpdateRequest.builder().newStatus(OrderStatus.PACKED).build(), 101L, "staff");
        orderService.updateOrderStatus(order2.getId(), OrderStatusUpdateRequest.builder().newStatus(OrderStatus.SHIPPED).build(), 101L, "staff");
        orderService.updateOrderStatus(order2.getId(), OrderStatusUpdateRequest.builder().newStatus(OrderStatus.IN_TRANSIT).build(), 101L, "staff");
        orderService.updateOrderStatus(order2.getId(), OrderStatusUpdateRequest.builder().newStatus(OrderStatus.OUT_FOR_DELIVERY).build(), 101L, "staff");
        orderService.updateOrderStatus(order2.getId(), OrderStatusUpdateRequest.builder().newStatus(OrderStatus.DELIVERED).build(), 101L, "staff");

        // Step 1: Customer requests return
        OrderResponse returnReq = orderService.updateOrderStatus(
                order2.getId(),
                OrderStatusUpdateRequest.builder().newStatus(OrderStatus.RETURN_REQUESTED).reasonNote("Customer requested return within 15-day eco warranty").build(),
                101L, "staff"
        );
        assertEquals(OrderStatus.RETURN_REQUESTED, returnReq.getCurrentStatus());

        // Step 2: Warehouse receives and confirms return
        OrderResponse returned = orderService.updateOrderStatus(
                order2.getId(),
                OrderStatusUpdateRequest.builder().newStatus(OrderStatus.RETURNED).reasonNote("Item inspected and restocked in warehouse").build(),
                101L, "staff"
        );
        assertEquals(OrderStatus.RETURNED, returned.getCurrentStatus());
    }
}
