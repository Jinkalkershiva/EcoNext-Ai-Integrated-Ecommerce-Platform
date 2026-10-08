package com.econext.order.kafka;

import com.econext.order.dto.ws.ContainerStatusWsMessage;
import com.econext.order.dto.ws.ShipmentLocationWsMessage;
import com.econext.order.dto.ws.ShipmentStatusWsMessage;
import com.econext.order.entity.OperationalOrder;
import com.econext.order.entity.OrderStatus;
import com.econext.order.entity.OrderStatusTransition;
import com.econext.order.repository.OperationalOrderRepository;
import com.econext.order.repository.OrderStatusTransitionRepository;
import com.econext.order.service.DjangoOrderSyncService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

@Component
@ConditionalOnProperty(name = "app.kafka.enabled", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
@Slf4j
public class FulfillmentKafkaConsumer {

    private final SimpMessagingTemplate messagingTemplate;
    private final OperationalOrderRepository orderRepository;
    private final OrderStatusTransitionRepository transitionRepository;
    private final DjangoOrderSyncService djangoOrderSyncService;

    @Transactional
    @KafkaListener(topics = FulfillmentEventProducer.TOPIC_SHIPMENT_STATUS, groupId = "${spring.kafka.consumer.group-id:order-ops-tracking-group}")
    public void handleShipmentStatusEvent(Map<String, Object> payload) {
        try {
            // idx-10: Kafka (shipment.status.updated) → Order Operations Service
            // Ingest Kafka fulfillment events to update order status and broadcast real-time STOMP WebSocket messages.
            log.info("Received shipment status event from Kafka: {}", payload);

            Object shipmentIdObj = payload.get("shipmentId");
            Object orderIdObj = payload.get("orderId");
            String status = (String) (payload.get("newStatus") != null ? payload.get("newStatus") : payload.get("status"));
            String oldStatus = (String) (payload.get("oldStatus") != null ? payload.get("oldStatus") : payload.get("previousStatus"));
            String location = (String) payload.get("location");

            if (shipmentIdObj == null || orderIdObj == null || status == null) {
                log.warn("Malformed shipment status payload: {}", payload);
                return;
            }

            Long shipmentId = ((Number) shipmentIdObj).longValue();
            String shipmentNumber = (String) payload.getOrDefault("shipmentNumber", "SHP-" + shipmentId);
            String carrierName = (String) payload.getOrDefault("carrierName", "EcoExpress Carbon-Neutral");
            String trackingNumber = (String) payload.getOrDefault("trackingNumber", "");

            // Collect all order IDs for this shipment
            java.util.Set<Long> allOrderIds = new java.util.LinkedHashSet<>();
            if (orderIdObj != null) {
                allOrderIds.add(((Number) orderIdObj).longValue());
            }
            if (payload.get("orderIds") instanceof java.util.Collection<?> col) {
                for (Object item : col) {
                    if (item instanceof Number num) {
                        allOrderIds.add(num.longValue());
                    }
                }
            }
            if (allOrderIds.isEmpty()) {
                // Look up in database
                orderRepository.findByShipmentId(shipmentId).forEach(o -> {
                    allOrderIds.add(o.getId());
                    if (o.getDjangoOrderId() != null) allOrderIds.add(o.getDjangoOrderId());
                });
            }

            OrderStatus targetOrderStatus = mapShipmentStatusToOrderStatus(status);

            for (Long oId : allOrderIds) {
                if (targetOrderStatus != null) {
                    syncOrderStatusFromEvent(oId, targetOrderStatus, status, carrierName, trackingNumber);
                }

                ShipmentStatusWsMessage wsMessage = ShipmentStatusWsMessage.builder()
                        .eventType("SHIPMENT_STATUS_UPDATED")
                        .shipmentId(shipmentId)
                        .shipmentNumber(shipmentNumber)
                        .orderId(oId)
                        .status(status)
                        .carrierName(carrierName)
                        .trackingNumber(trackingNumber)
                        .timestamp(LocalDateTime.now())
                        .build();

                messagingTemplate.convertAndSend("/topic/orders/" + oId, wsMessage);
            }

            // Broadcast real-time STOMP messages for shipment and fulfillment dashboards
            ShipmentStatusWsMessage generalWsMessage = ShipmentStatusWsMessage.builder()
                    .eventType("SHIPMENT_STATUS_UPDATED")
                    .shipmentId(shipmentId)
                    .shipmentNumber(shipmentNumber)
                    .orderId(orderIdObj != null ? ((Number) orderIdObj).longValue() : null)
                    .status(status)
                    .carrierName(carrierName)
                    .trackingNumber(trackingNumber)
                    .timestamp(LocalDateTime.now())
                    .build();

            messagingTemplate.convertAndSend("/topic/shipments/" + shipmentId, generalWsMessage);
            messagingTemplate.convertAndSend("/topic/fulfillment/activity", generalWsMessage);
            messagingTemplate.convertAndSend("/topic/fulfillment/analytics", generalWsMessage);

            log.info("Broadcasted shipment status update via STOMP to /topic/shipments/{}, {} orders and fulfillment analytics", shipmentId, allOrderIds.size());
        } catch (Exception ex) {
            log.error("Failed to process and broadcast shipment status event from Kafka: {}", ex.getMessage(), ex);
        }
    }

    private OrderStatus mapShipmentStatusToOrderStatus(String shipmentStatus) {
        if (shipmentStatus == null) return null;
        switch (shipmentStatus.toUpperCase()) {
            case "CREATED":
                return OrderStatus.ORDER_CONFIRMED;
            case "PACKED":
                return OrderStatus.PACKED;
            case "DISPATCHED":
                return OrderStatus.SHIPPED;
            case "IN_TRANSIT":
            case "ARRIVED_AT_HUB":
                return OrderStatus.IN_TRANSIT;
            case "OUT_FOR_DELIVERY":
                return OrderStatus.OUT_FOR_DELIVERY;
            case "DELIVERED":
                // Individual order delivery is strictly gated by DeliveryOtpService verification with audit record
                return null;
            case "CANCELLED":
                return OrderStatus.CANCELLED;
            default:
                return null;
        }
    }

    private void syncOrderStatusFromEvent(Long orderId, OrderStatus targetStatus, String shipmentStatus, String carrierName, String trackingNumber) {
        try {
            Optional<OperationalOrder> orderOpt = orderRepository.findById(orderId)
                    .or(() -> orderRepository.findByDjangoOrderId(orderId));

            if (orderOpt.isEmpty()) {
                OperationalOrder fetched = djangoOrderSyncService.fetchOrderFromDjango(orderId);
                if (fetched != null) {
                    orderOpt = Optional.of(orderRepository.save(fetched));
                }
            }

            if (orderOpt.isPresent()) {
                OperationalOrder order = orderOpt.get();
                OrderStatus prev = order.getCurrentStatus();

                if (prev != targetStatus && prev != OrderStatus.DELIVERED && prev != OrderStatus.CANCELLED) {
                    order.setCurrentStatus(targetStatus);
                    if (carrierName != null && !carrierName.isBlank()) order.setCarrierName(carrierName);
                    if (trackingNumber != null && !trackingNumber.isBlank()) order.setTrackingNumber(trackingNumber);
                    orderRepository.save(order);

                    OrderStatusTransition transition = OrderStatusTransition.builder()
                            .orderId(order.getId())
                            .fromStatus(prev)
                            .toStatus(targetStatus)
                            .reasonNote("Automated event-driven synchronization from shipment transition to " + shipmentStatus)
                            .staffId(null)
                            .staffUsername("EVENT_BUS")
                            .build();
                    transitionRepository.save(transition);

                    djangoOrderSyncService.syncOrderStatusToDjango(
                            order.getDjangoOrderId() != null ? order.getDjangoOrderId() : order.getId(),
                            targetStatus
                    );
                    log.info("Successfully synchronized Order #{} status to {} from shipment event {}", order.getId(), targetStatus, shipmentStatus);
                }
            }
        } catch (Exception e) {
            log.warn("Error during event-driven order sync for Order #{}: {}", orderId, e.getMessage());
        }
    }

    @KafkaListener(topics = FulfillmentEventProducer.TOPIC_SHIPMENT_LOCATION, groupId = "${spring.kafka.consumer.group-id:order-ops-tracking-group}")
    public void handleShipmentLocationEvent(Map<String, Object> payload) {
        try {
            // idx-10: Kafka (shipment.location.updated) → Order Operations Service
            log.info("Received shipment GPS location event from Kafka: {}", payload);

            Object shipmentIdObj = payload.get("shipmentId");
            Object orderIdObj = payload.get("orderId");
            Object latObj = payload.get("latitude");
            Object lonObj = payload.get("longitude");

            if (shipmentIdObj == null || latObj == null || lonObj == null) {
                log.warn("Malformed shipment location payload: {}", payload);
                return;
            }

            Long shipmentId = ((Number) shipmentIdObj).longValue();
            BigDecimal latitude = new BigDecimal(String.valueOf(latObj));
            BigDecimal longitude = new BigDecimal(String.valueOf(lonObj));
            String shipmentNumber = (String) payload.getOrDefault("shipmentNumber", "SHP-" + shipmentId);
            String locationName = (String) payload.getOrDefault("locationName", "");
            String status = (String) payload.getOrDefault("status", "IN_TRANSIT");
            String trackingNumber = (String) payload.getOrDefault("trackingNumber", "");
            String vehicleNumber = (String) payload.getOrDefault("vehicleNumber", "");
            String note = (String) payload.getOrDefault("note", "");

            java.util.Set<Long> allOrderIds = new java.util.LinkedHashSet<>();
            if (orderIdObj != null) {
                allOrderIds.add(((Number) orderIdObj).longValue());
            }
            if (payload.get("orderIds") instanceof java.util.Collection<?> col) {
                for (Object item : col) {
                    if (item instanceof Number num) {
                        allOrderIds.add(num.longValue());
                    }
                }
            }
            if (allOrderIds.isEmpty()) {
                orderRepository.findByShipmentId(shipmentId).forEach(o -> {
                    allOrderIds.add(o.getId());
                    if (o.getDjangoOrderId() != null) allOrderIds.add(o.getDjangoOrderId());
                });
            }

            for (Long oId : allOrderIds) {
                ShipmentLocationWsMessage orderWsMessage = ShipmentLocationWsMessage.builder()
                        .eventType("SHIPMENT_LOCATION_UPDATED")
                        .shipmentId(shipmentId)
                        .shipmentNumber(shipmentNumber)
                        .orderId(oId)
                        .latitude(latitude)
                        .longitude(longitude)
                        .locationName(locationName)
                        .status(status)
                        .trackingNumber(trackingNumber)
                        .vehicleNumber(vehicleNumber)
                        .note(note)
                        .timestamp(LocalDateTime.now())
                        .build();
                messagingTemplate.convertAndSend("/topic/orders/" + oId, orderWsMessage);
            }

            ShipmentLocationWsMessage wsMessage = ShipmentLocationWsMessage.builder()
                    .eventType("SHIPMENT_LOCATION_UPDATED")
                    .shipmentId(shipmentId)
                    .shipmentNumber(shipmentNumber)
                    .orderId(orderIdObj != null ? ((Number) orderIdObj).longValue() : null)
                    .latitude(latitude)
                    .longitude(longitude)
                    .locationName(locationName)
                    .status(status)
                    .trackingNumber(trackingNumber)
                    .vehicleNumber(vehicleNumber)
                    .note(note)
                    .timestamp(LocalDateTime.now())
                    .build();

            messagingTemplate.convertAndSend("/topic/shipments/" + shipmentId, wsMessage);
            messagingTemplate.convertAndSend("/topic/fulfillment/activity", wsMessage);
            messagingTemplate.convertAndSend("/topic/fulfillment/analytics", wsMessage);

            log.info("Broadcasted shipment GPS location via STOMP: shipmentId={}, lat={}, lon={}, ordersCount={}", shipmentId, latitude, longitude, allOrderIds.size());
        } catch (Exception ex) {
            log.error("Failed to process and broadcast shipment location event from Kafka: {}", ex.getMessage(), ex);
        }
    }

    @KafkaListener(topics = FulfillmentEventProducer.TOPIC_CONTAINER_STATUS, groupId = "${spring.kafka.consumer.group-id:order-ops-tracking-group}")
    public void handleContainerStatusEvent(Map<String, Object> payload) {
        try {
            log.info("Received container status event from Kafka: {}", payload);

            Object containerIdObj = payload.get("containerId");
            String status = (String) payload.get("status");

            if (containerIdObj == null || status == null) {
                return;
            }

            Long containerId = ((Number) containerIdObj).longValue();
            String containerCode = (String) payload.getOrDefault("containerCode", "CONT-" + containerId);
            String origin = (String) payload.getOrDefault("origin", "");
            String destination = (String) payload.getOrDefault("destination", "");

            ContainerStatusWsMessage wsMessage = ContainerStatusWsMessage.builder()
                    .eventType("CONTAINER_STATUS_UPDATED")
                    .containerId(containerId)
                    .containerCode(containerCode)
                    .status(status)
                    .origin(origin)
                    .destination(destination)
                    .timestamp(LocalDateTime.now())
                    .build();

            messagingTemplate.convertAndSend("/topic/containers/" + containerId, wsMessage);
            messagingTemplate.convertAndSend("/topic/fulfillment/activity", wsMessage);
            messagingTemplate.convertAndSend("/topic/fulfillment/analytics", wsMessage);

            log.info("Broadcasted container status update via STOMP: containerId={}, code={}, status={}", containerId, containerCode, status);
        } catch (Exception ex) {
            log.error("Failed to process container status event from Kafka: {}", ex.getMessage(), ex);
        }
    }

    @Transactional
    @KafkaListener(topics = FulfillmentEventProducer.TOPIC_ORDER_EVENTS, groupId = "${spring.kafka.consumer.group-id:order-ops-tracking-group}")
    public void handleOrderEvent(Map<String, Object> payload) {
        try {
            log.info("Received order event from Kafka: {}", payload);

            @SuppressWarnings("unchecked")
            Map<String, Object> data = payload;
            if (payload.containsKey("data") && payload.get("data") instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> innerData = (Map<String, Object>) payload.get("data");
                data = innerData;
            }

            Object orderIdObj = data.get("orderId") != null ? data.get("orderId") : (data.get("order_id") != null ? data.get("order_id") : data.get("id"));
            if (orderIdObj == null) {
                log.warn("Malformed order event payload (missing order ID): {}", payload);
                return;
            }

            Long orderId = ((Number) orderIdObj).longValue();
            String statusStr = (String) (data.get("status") != null ? data.get("status") : data.get("canonical_status"));
            OrderStatus targetStatus = OrderStatus.ORDER_CONFIRMED;
            if (statusStr != null) {
                try {
                    String norm = statusStr.toUpperCase().replace(" ", "_");
                    if (norm.equals("PENDING") || norm.equals("ORDER_PLACED")) {
                        targetStatus = OrderStatus.ORDER_PLACED;
                    } else if (norm.equals("PAYMENT_CONFIRMED") || norm.equals("CONFIRMED") || norm.equals("ORDER_ACCEPTED")) {
                        targetStatus = OrderStatus.ORDER_CONFIRMED;
                    } else {
                        targetStatus = OrderStatus.valueOf(norm);
                    }
                } catch (Exception e) {
                    targetStatus = OrderStatus.ORDER_CONFIRMED;
                }
            }

            // Check if OperationalOrder exists (idempotency check by djangoOrderId or id)
            Optional<OperationalOrder> orderOpt = orderRepository.findByDjangoOrderId(orderId)
                    .or(() -> orderRepository.findById(orderId));

            OperationalOrder order;
            if (orderOpt.isEmpty()) {
                // Fetch full order entity with items and addresses from Django
                OperationalOrder fetched = djangoOrderSyncService.fetchOrderFromDjango(orderId);
                if (fetched != null) {
                    fetched.setCurrentStatus(targetStatus);
                    order = orderRepository.save(fetched);
                    log.info("Ingested and created OperationalOrder #{} (Django Order #{}) from Kafka order event with status {}",
                            order.getId(), orderId, targetStatus);
                } else {
                    // Create minimal placeholder OperationalOrder if Django unreachable
                    Object totalAmtObj = data.get("totalAmount") != null ? data.get("totalAmount") : data.get("total_amount");
                    BigDecimal totalAmount = totalAmtObj != null ? new BigDecimal(String.valueOf(totalAmtObj)) : BigDecimal.ZERO;
                    String userIdStr = String.valueOf(data.getOrDefault("userId", "1"));
                    Long userId = 1L;
                    try { userId = Long.parseLong(userIdStr); } catch (Exception ignored) {}

                    String ordNum = (String) data.get("orderNumber");
                    if (ordNum == null) ordNum = (String) data.get("order_number");

                    order = OperationalOrder.builder()
                            .customerId(userId)
                            .customerUsername("CUSTOMER_" + userId)
                            .customerEmail("customer" + userId + "@econext.org")
                            .customerName("Valued Customer")
                            .totalAmount(totalAmount)
                            .currentStatus(targetStatus)
                            .djangoOrderId(orderId)
                            .orderNumber(ordNum)
                            .build();
                    order = orderRepository.save(order);
                    log.info("Created placeholder OperationalOrder #{} from Kafka order event", order.getId());
                }

                // Record initial transition
                OrderStatusTransition transition = OrderStatusTransition.builder()
                        .orderId(order.getId())
                        .fromStatus(OrderStatus.ORDER_PLACED)
                        .toStatus(targetStatus)
                        .reasonNote("Order received via Kafka order-events topic")
                        .staffUsername("EVENT_BUS")
                        .build();
                transitionRepository.save(transition);
            } else {
                order = orderOpt.get();
                OrderStatus prev = order.getCurrentStatus();
                if (prev != targetStatus && prev != OrderStatus.DELIVERED && prev != OrderStatus.CANCELLED) {
                    order.setCurrentStatus(targetStatus);
                    order = orderRepository.save(order);

                    OrderStatusTransition transition = OrderStatusTransition.builder()
                            .orderId(order.getId())
                            .fromStatus(prev)
                            .toStatus(targetStatus)
                            .reasonNote("Status updated via Kafka order-events topic")
                            .staffUsername("EVENT_BUS")
                            .build();
                    transitionRepository.save(transition);
                    log.info("Updated OperationalOrder #{} status from {} to {} via Kafka", order.getId(), prev, targetStatus);
                }
            }

            // Broadcast live update to STOMP WebSocket
            Map<String, Object> wsMsg = Map.of(
                    "eventType", "ORDER_STATUS_UPDATED",
                    "orderId", orderId,
                    "operationalOrderId", order.getId(),
                    "status", targetStatus.name(),
                    "timestamp", LocalDateTime.now().toString()
            );
            messagingTemplate.convertAndSend("/topic/orders/" + orderId, wsMsg);
            messagingTemplate.convertAndSend("/topic/fulfillment/activity", wsMsg);
        } catch (Exception ex) {
            log.error("Failed to process order event from Kafka: {}", ex.getMessage(), ex);
        }
    }
}
