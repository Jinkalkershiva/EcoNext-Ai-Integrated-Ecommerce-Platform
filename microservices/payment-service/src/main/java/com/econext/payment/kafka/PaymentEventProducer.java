package com.econext.payment.kafka;

import com.econext.payment.dto.PaymentEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class PaymentEventProducer {

    @Autowired(required = false)
    private KafkaTemplate<String, Object> kafkaTemplate;

    private static final String TOPIC_PAYMENT_EVENTS = "payment-events";

    public void publishPaymentEvent(PaymentEvent event) {
        if (kafkaTemplate == null) {
            log.info("Kafka is disabled or template not configured. Skipping event emission for order {}", event.getOrderId());
            return;
        }

        try {
            log.info("Publishing payment event to topic {}: orderId={}, status={}", TOPIC_PAYMENT_EVENTS, event.getOrderId(), event.getStatus());
            kafkaTemplate.send(TOPIC_PAYMENT_EVENTS, String.valueOf(event.getOrderId()), event);
        } catch (Exception ex) {
            log.warn("Failed to publish payment event to Kafka (proceeding gracefully): {}", ex.getMessage());
        }
    }
}
