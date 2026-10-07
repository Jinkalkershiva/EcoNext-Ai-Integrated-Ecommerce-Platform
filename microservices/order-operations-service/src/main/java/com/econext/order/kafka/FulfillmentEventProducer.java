package com.econext.order.kafka;

import com.econext.order.dto.event.ContainerStatusUpdatedEvent;
import com.econext.order.dto.event.ShipmentLocationUpdatedEvent;
import com.econext.order.dto.event.ShipmentStatusUpdatedEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.util.concurrent.CompletableFuture;

@Component
@Slf4j
public class FulfillmentEventProducer {

    public static final String TOPIC_SHIPMENT_STATUS = "shipment.status.updated";
    public static final String TOPIC_SHIPMENT_LOCATION = "shipment.location.updated";
    public static final String TOPIC_CONTAINER_STATUS = "container.status.updated";
    public static final String TOPIC_ORDER_EVENTS = "order-events";

    @Autowired(required = false)
    private KafkaTemplate<String, Object> kafkaTemplate;

    public void publishShipmentStatusUpdated(ShipmentStatusUpdatedEvent event) {
        if (kafkaTemplate == null) {
            log.debug("Kafka template not configured or disabled. Skipping publication of shipment status event for shipment {}", event.getShipmentId());
            return;
        }

        CompletableFuture.runAsync(() -> {
            try {
                // idx-06: Order Operations Service → Kafka Topic (shipment.status.updated)
                // reason: Broadcast shipment status lifecycle transition for notifications and live tracking.
                log.info("Publishing event to topic '{}': shipmentId={}, orderId={}, status={}",
                        TOPIC_SHIPMENT_STATUS, event.getShipmentId(), event.getOrderId(), event.getStatus());
                kafkaTemplate.send(TOPIC_SHIPMENT_STATUS, String.valueOf(event.getShipmentId()), event);
            } catch (Exception ex) {
                log.warn("Failed to publish shipment status event to Kafka topic '{}': {}", TOPIC_SHIPMENT_STATUS, ex.getMessage());
            }
        });
    }

    public void publishShipmentLocationUpdated(ShipmentLocationUpdatedEvent event) {
        if (kafkaTemplate == null) {
            log.debug("Kafka template not configured or disabled. Skipping publication of shipment location event for shipment {}", event.getShipmentId());
            return;
        }

        CompletableFuture.runAsync(() -> {
            try {
                // idx-07: Order Operations Service → Kafka Topic (shipment.location.updated)
                // reason: Broadcast real-time physical vehicle GPS coordinate update.
                log.info("Publishing event to topic '{}': shipmentId={}, orderId={}, lat={}, lon={}",
                        TOPIC_SHIPMENT_LOCATION, event.getShipmentId(), event.getOrderId(), event.getLatitude(), event.getLongitude());
                kafkaTemplate.send(TOPIC_SHIPMENT_LOCATION, String.valueOf(event.getShipmentId()), event);
            } catch (Exception ex) {
                log.warn("Failed to publish shipment location event to Kafka topic '{}': {}", TOPIC_SHIPMENT_LOCATION, ex.getMessage());
            }
        });
    }

    public void publishContainerStatusUpdated(ContainerStatusUpdatedEvent event) {
        if (kafkaTemplate == null) {
            log.debug("Kafka template not configured or disabled. Skipping publication of container status event for container {}", event.getContainerId());
            return;
        }

        CompletableFuture.runAsync(() -> {
            try {
                // idx-08: Order Operations Service → Kafka Topic (container.status.updated)
                // reason: Broadcast container batch movement status.
                log.info("Publishing event to topic '{}': containerId={}, code={}, status={}",
                        TOPIC_CONTAINER_STATUS, event.getContainerId(), event.getContainerCode(), event.getStatus());
                kafkaTemplate.send(TOPIC_CONTAINER_STATUS, String.valueOf(event.getContainerId()), event);
            } catch (Exception ex) {
                log.warn("Failed to publish container status event to Kafka topic '{}': {}", TOPIC_CONTAINER_STATUS, ex.getMessage());
            }
        });
    }
}
