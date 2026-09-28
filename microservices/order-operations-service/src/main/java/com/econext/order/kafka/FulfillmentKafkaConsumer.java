package com.econext.order.kafka;

import com.econext.order.dto.ws.ContainerStatusWsMessage;
import com.econext.order.dto.ws.ShipmentLocationWsMessage;
import com.econext.order.dto.ws.ShipmentStatusWsMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

@Component
@ConditionalOnProperty(name = "app.kafka.enabled", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
@Slf4j
public class FulfillmentKafkaConsumer {

    private final SimpMessagingTemplate messagingTemplate;

    @KafkaListener(topics = FulfillmentEventProducer.TOPIC_SHIPMENT_STATUS, groupId = "${spring.kafka.consumer.group-id:order-ops-tracking-group}")
    public void handleShipmentStatusEvent(Map<String, Object> payload) {
        try {
            // idx-10: Kafka (shipment.status.updated & shipment.location.updated) → Order Operations Service
            // reason: Ingest Kafka fulfillment events to broadcast real-time STOMP WebSocket messages to customers and admin.
            log.info("Received shipment status event from Kafka: {}", payload);

            Object shipmentIdObj = payload.get("shipmentId");
            Object orderIdObj = payload.get("orderId");
            String status = (String) payload.get("status");

            if (shipmentIdObj == null || orderIdObj == null || status == null) {
                log.warn("Malformed shipment status payload: {}", payload);
                return;
            }

            Long shipmentId = ((Number) shipmentIdObj).longValue();
            Long orderId = ((Number) orderIdObj).longValue();
            String shipmentNumber = (String) payload.getOrDefault("shipmentNumber", "SHP-" + orderId + "-" + shipmentId);
            String carrierName = (String) payload.getOrDefault("carrierName", "EcoExpress Carbon-Neutral");
            String trackingNumber = (String) payload.getOrDefault("trackingNumber", "");

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

            // idx-11: Order Operations Service (WebSocket / STOMP) → Customer & Admin Dashboard
            // reason: Stream real-time vehicle GPS coordinates and shipment milestone state transitions.
            messagingTemplate.convertAndSend("/topic/shipments/" + shipmentId, wsMessage);
            messagingTemplate.convertAndSend("/topic/orders/" + orderId, wsMessage);
            messagingTemplate.convertAndSend("/topic/fulfillment/activity", wsMessage);
            messagingTemplate.convertAndSend("/topic/fulfillment/analytics", wsMessage);

            log.info("Broadcasted shipment status update via STOMP to /topic/shipments/{}, /topic/orders/{} and fulfillment analytics", shipmentId, orderId);
        } catch (Exception ex) {
            log.error("Failed to process and broadcast shipment status event from Kafka: {}", ex.getMessage(), ex);
        }
    }

    @KafkaListener(topics = FulfillmentEventProducer.TOPIC_SHIPMENT_LOCATION, groupId = "${spring.kafka.consumer.group-id:order-ops-tracking-group}")
    public void handleShipmentLocationEvent(Map<String, Object> payload) {
        try {
            // idx-10: Kafka (shipment.status.updated & shipment.location.updated) → Order Operations Service
            // reason: Ingest Kafka fulfillment events to broadcast real-time STOMP WebSocket messages to customers and admin.
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

            // idx-11: Order Operations Service (WebSocket / STOMP) → Customer & Admin Dashboard
            // reason: Stream real-time vehicle GPS coordinates and shipment milestone state transitions.
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
            log.info("Broadcasted container status update via STOMP to /topic/containers/{}", containerId);
        } catch (Exception ex) {
            log.error("Failed to process and broadcast container status event from Kafka: {}", ex.getMessage(), ex);
        }
    }
}
