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
            Long orderId = ((Number) orderIdObj).longValue();
            String shipmentNumber = (String) payload.getOrDefault("shipmentNumber", "SHP-" + orderId + "-" + shipmentId);
            String carrierName = (String) payload.getOrDefault("carrierName", "EcoExpress Carbon-Neutral");
            String trackingNumber = (String) payload.getOrDefault("trackingNumber", "");

            // 1. Map Shipment status to Order status automatically:
            // CREATED -> ORDER_CONFIRMED
            // PACKED -> PACKED
            // DISPATCHED -> SHIPPED
            // IN_TRANSIT -> IN_TRANSIT
            // ARRIVED_AT_HUB -> IN_TRANSIT
            // OUT_FOR_DELIVERY -> OUT_FOR_DELIVERY
            // DELIVERED -> DELIVERED
            OrderStatus targetOrderStatus = mapShipmentStatusToOrderStatus(status);

            if (targetOrderStatus != null) {
                syncOrderStatusFromEvent(orderId, targetOrderStatus, status, carrierName, trackingNumber);
            }

            // 2. Broadcast real-time STOMP messages
            ShipmentStatusWsMessage wsMessage = ShipmentStatusWsMessage.builder()
                    .eventType("SHIPMENT_STATUS_UPDATED")
                    .shipmentId(shipmentId)
                    .shipmentNumber(shipmentNumber)
                    .orderId(orderId)
                    .status(status)
                    .carrierName(carrierName)
                    .trackingNumber(trackingNumber)
                    .timestamp(LocalDateTime.now())
                    .build();

            messagingTemplate.convertAndSend("/topic/shipments/" + shipmentId, wsMessage);
            messagingTemplate.convertAndSend("/topic/orders/" + orderId, wsMessage);
            messagingTemplate.convertAndSend("/topic/fulfillment/activity", wsMessage);
            messagingTemplate.convertAndSend("/topic/fulfillment/analytics", wsMessage);

            log.info("Broadcasted shipment status update via STOMP to /topic/shipments/{}, /topic/orders/{} and fulfillment analytics", shipmentId, orderId);
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
                return OrderStatus.DELIVERED;
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
            Long orderId = orderIdObj != null ? ((Number) orderIdObj).longValue() : null;
            BigDecimal latitude = new BigDecimal(String.valueOf(latObj));
            BigDecimal longitude = new BigDecimal(String.valueOf(lonObj));
            String shipmentNumber = (String) payload.getOrDefault("shipmentNumber", "SHP-" + shipmentId);
            String locationName = (String) payload.getOrDefault("locationName", "");
            String status = (String) payload.getOrDefault("status", "IN_TRANSIT");
            String trackingNumber = (String) payload.getOrDefault("trackingNumber", "");
            String vehicleNumber = (String) payload.getOrDefault("vehicleNumber", "");
            String note = (String) payload.getOrDefault("note", "");

            ShipmentLocationWsMessage wsMessage = ShipmentLocationWsMessage.builder()
                    .eventType("SHIPMENT_LOCATION_UPDATED")
                    .shipmentId(shipmentId)
                    .shipmentNumber(shipmentNumber)
                    .orderId(orderId)
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
            if (orderId != null) {
                messagingTemplate.convertAndSend("/topic/orders/" + orderId, wsMessage);
            }
            messagingTemplate.convertAndSend("/topic/fulfillment/activity", wsMessage);
            messagingTemplate.convertAndSend("/topic/fulfillment/analytics", wsMessage);

            log.info("Broadcasted shipment GPS location via STOMP: shipmentId={}, lat={}, lon={}", shipmentId, latitude, longitude);
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
}
