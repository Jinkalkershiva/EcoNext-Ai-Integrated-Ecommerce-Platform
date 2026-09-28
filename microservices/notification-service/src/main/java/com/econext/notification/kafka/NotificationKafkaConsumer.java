package com.econext.notification.kafka;

import com.econext.notification.dto.NotificationRequest;
import com.econext.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@ConditionalOnProperty(name = "app.kafka.enabled", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
@Slf4j
public class NotificationKafkaConsumer {

    private final NotificationService notificationService;

    @KafkaListener(topics = "payment-events", groupId = "${spring.kafka.consumer.group-id:notification-service-group}")
    public void handlePaymentEvent(Map<String, Object> payload) {
        try {
            log.info("Received payment event via Kafka: {}", payload);
            Object userIdObj = payload.get("user_id");
            Object orderIdObj = payload.get("order_id");
            String status = (String) payload.get("status");
            Object amountObj = payload.get("amount");

            if (userIdObj == null) {
                log.warn("Payment event missing user_id: {}", payload);
                return;
            }

            Long userId = ((Number) userIdObj).longValue();
            String orderId = String.valueOf(orderIdObj);

            if ("SUCCESS".equalsIgnoreCase(status)) {
                notificationService.createNotification(NotificationRequest.builder()
                        .userId(userId)
                        .type("PAYMENT_SUCCESS")
                        .title("🌿 Payment Successful!")
                        .message(String.format("Your payment of ₹%s for Order #%s was verified and completed successfully.", amountObj, orderId))
                        .referenceId("ORDER-" + orderId)
                        .build());
            } else if ("FAILED".equalsIgnoreCase(status)) {
                String error = (String) payload.getOrDefault("error_message", "Transaction could not be completed.");
                notificationService.createNotification(NotificationRequest.builder()
                        .userId(userId)
                        .type("PAYMENT_FAILED")
                        .title("⚠️ Payment Failed")
                        .message(String.format("Payment for Order #%s failed: %s", orderId, error))
                        .referenceId("ORDER-" + orderId)
                        .build());
            }
        } catch (Exception ex) {
            log.error("Failed to process payment event from Kafka: {}", ex.getMessage(), ex);
        }
    }

    @KafkaListener(topics = "order-events", groupId = "${spring.kafka.consumer.group-id:notification-service-group}")
    public void handleOrderEvent(Map<String, Object> payload) {
        try {
            log.info("Received order event via Kafka: {}", payload);
            Object userIdObj = payload.get("user_id");
            Object orderIdObj = payload.get("order_id");
            String status = (String) payload.get("status");

            if (userIdObj == null) {
                return;
            }

            Long userId = ((Number) userIdObj).longValue();
            String orderId = String.valueOf(orderIdObj);

            if ("created".equalsIgnoreCase(status) || "pending".equalsIgnoreCase(status)) {
                notificationService.createNotification(NotificationRequest.builder()
                        .userId(userId)
                        .type("ORDER_CREATED")
                        .title("📦 Order Placed Successfully!")
                        .message(String.format("Your sustainable order #%s has been received and is being prepared for carbon-neutral delivery.", orderId))
                        .referenceId("ORDER-" + orderId)
                        .build());
            } else if ("shipped".equalsIgnoreCase(status)) {
                notificationService.createNotification(NotificationRequest.builder()
                        .userId(userId)
                        .type("ORDER_SHIPPED")
                        .title("🚚 Order Shipped!")
                        .message(String.format("Great news! Your eco-packaged order #%s is now on its way to you.", orderId))
                        .referenceId("ORDER-" + orderId)
                        .build());
            } else if ("delivered".equalsIgnoreCase(status)) {
                notificationService.createNotification(NotificationRequest.builder()
                        .userId(userId)
                        .type("ORDER_DELIVERED")
                        .title("🎉 Order Delivered!")
                        .message(String.format("Order #%s has arrived. Thank you for choosing sustainable retail with EcoNext!", orderId))
                        .referenceId("ORDER-" + orderId)
                        .build());
            }
        } catch (Exception ex) {
            log.error("Failed to process order event from Kafka: {}", ex.getMessage(), ex);
        }
    }

    @KafkaListener(topics = "shipment.status.updated", groupId = "${spring.kafka.consumer.group-id:notification-service-group}")
    public void handleShipmentStatusEvent(Map<String, Object> payload) {
        try {
            // idx-09: Notification Service ← Kafka Topic (shipment.status.updated)
            // reason: Ingest shipment status updates to dispatch customer delivery notifications.
            log.info("Received shipment status event via Kafka: {}", payload);
            Object orderIdObj = payload.get("orderId");
            Object shipmentIdObj = payload.get("shipmentId");
            Object shipmentNumObj = payload.get("shipmentNumber");
            String status = (String) payload.get("status");
            String carrierName = (String) payload.getOrDefault("carrierName", "EcoExpress Carbon-Neutral");
            String trackingNum = (String) payload.getOrDefault("trackingNumber", "");

            if (orderIdObj == null || status == null) {
                return;
            }

            String orderId = String.valueOf(orderIdObj);
            String shipmentNumber = shipmentNumObj != null ? String.valueOf(shipmentNumObj) : ("Shipment #" + shipmentIdObj);

            log.info("Shipment event processed: {} for Order #{} -> Status: {}, Carrier: {}, Tracking: {}",
                    shipmentNumber, orderId, status, carrierName, trackingNum);
        } catch (Exception ex) {
            log.error("Failed to process shipment status event from Kafka: {}", ex.getMessage(), ex);
        }
    }
}
