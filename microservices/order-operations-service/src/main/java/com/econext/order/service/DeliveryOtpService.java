package com.econext.order.service;

import com.econext.order.dto.DeliveryOtpResponse;
import com.econext.order.dto.ShipmentResponse;
import com.econext.order.dto.ws.ShipmentStatusWsMessage;
import com.econext.order.entity.DeliveryVerificationAudit;
import com.econext.order.entity.OperationalOrder;
import com.econext.order.entity.OrderStatus;
import com.econext.order.entity.OrderStatusTransition;
import com.econext.order.entity.Shipment;
import com.econext.order.entity.ShipmentStatus;
import com.econext.order.exception.GlobalExceptionHandler.BadRequestException;
import com.econext.order.exception.GlobalExceptionHandler.ResourceNotFoundException;
import com.econext.order.repository.DeliveryVerificationAuditRepository;
import com.econext.order.repository.OperationalOrderRepository;
import com.econext.order.repository.OrderStatusTransitionRepository;
import com.econext.order.repository.ShipmentRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
public class DeliveryOtpService {

    public static final int OTP_LENGTH = 6;
    public static final int OTP_TTL_SECONDS = 300; // 5 minutes production TTL
    public static final int MAX_ATTEMPTS = 5;

    public static final String REDIS_ORDER_KEY_PREFIX = "delivery:otp:";
    public static final String REDIS_SENT_KEY_PREFIX = "delivery:otp:sent:";
    public static final String REDIS_SHIPMENT_KEY_PREFIX = "delivery:otp:shipment:";

    private final SecureRandom secureRandom = new SecureRandom();
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    private final ShipmentRepository shipmentRepository;
    private final OperationalOrderRepository orderRepository;
    private final EmailNotificationService emailNotificationService;
    private final ShipmentService shipmentService;
    private final DeliveryVerificationAuditRepository deliveryVerificationAuditRepository;
    private final OrderStatusTransitionRepository transitionRepository;
    private final DjangoOrderSyncService djangoOrderSyncService;

    @Autowired(required = false)
    private SimpMessagingTemplate messagingTemplate;

    @Autowired(required = false)
    private StringRedisTemplate redisTemplate;

    // High-performance thread-safe in-memory cache fallback if Redis is unavailable
    private final Map<Long, OtpEntry> inMemoryOrderOtpStore = new ConcurrentHashMap<>();
    private final Map<Long, OtpEntry> inMemoryShipmentOtpStore = new ConcurrentHashMap<>();
    private final Map<String, Long> inMemorySentStore = new ConcurrentHashMap<>();

    public DeliveryOtpService(
            ShipmentRepository shipmentRepository,
            OperationalOrderRepository orderRepository,
            EmailNotificationService emailNotificationService,
            @Lazy ShipmentService shipmentService,
            DeliveryVerificationAuditRepository deliveryVerificationAuditRepository,
            OrderStatusTransitionRepository transitionRepository,
            DjangoOrderSyncService djangoOrderSyncService
    ) {
        this.shipmentRepository = shipmentRepository;
        this.orderRepository = orderRepository;
        this.emailNotificationService = emailNotificationService;
        this.shipmentService = shipmentService;
        this.deliveryVerificationAuditRepository = deliveryVerificationAuditRepository;
        this.transitionRepository = transitionRepository;
        this.djangoOrderSyncService = djangoOrderSyncService;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties(ignoreUnknown = true)
    public static class OtpEntry {
        private String otpHashed;
        private String plainOtpForDev; // Only logged/used in non-prod or fallback
        private int attempts;
        private long expiryEpochMs;
        private Long shipmentId;
        private Long orderId;
        private String customerEmail;
        private String customerPhone;
        private String generatedAtIso;

        @com.fasterxml.jackson.annotation.JsonIgnore
        public boolean isExpired() {
            return System.currentTimeMillis() > expiryEpochMs;
        }

        @com.fasterxml.jackson.annotation.JsonIgnore
        public long getRemainingSeconds() {
            long diff = (expiryEpochMs - System.currentTimeMillis()) / 1000;
            return Math.max(0, diff);
        }

        @com.fasterxml.jackson.annotation.JsonIgnore
        public LocalDateTime getGeneratedAt() {
            if (generatedAtIso == null || generatedAtIso.isBlank()) return LocalDateTime.now();
            try {
                return LocalDateTime.parse(generatedAtIso);
            } catch (Exception e) {
                return LocalDateTime.now();
            }
        }
    }

    /**
     * Hash OTP with SHA-256 for secure Redis storage
     */
    public static String hashOtp(String otp, Long orderId) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            String salt = "econext-delivery-salt-" + orderId;
            byte[] hash = digest.digest((otp + salt).getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            return Integer.toHexString(otp.hashCode());
        }
    }

    /**
     * Generates and dispatches a secure 6-digit Delivery PIN / OTP for a shipment or order.
     * Guaranteed idempotent: Checks delivery:otp:sent:{orderId} before dispatching email.
     */
    public DeliveryOtpResponse generateAndSendOtp(Long shipmentId, Long staffId, String staffUsername) {
        return generateAndSendOtp(shipmentId, null, staffId, staffUsername);
    }

    @Transactional
    public DeliveryOtpResponse generateAndSendOtp(Long shipmentId, Long targetOrderId, Long staffId, String staffUsername) {
        Shipment shipment = shipmentRepository.findById(shipmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment not found with ID: " + shipmentId));

        OperationalOrder order = null;
        if (targetOrderId != null) {
            order = orderRepository.findByDjangoOrderId(targetOrderId)
                    .or(() -> orderRepository.findById(targetOrderId))
                    .orElse(null);
        }
        if (order == null && shipment.getOrderId() != null) {
            order = orderRepository.findById(shipment.getOrderId()).orElse(null);
        }
        if (order == null && shipment.getAssignedOrders() != null && !shipment.getAssignedOrders().isEmpty()) {
            order = shipment.getAssignedOrders().stream()
                    .filter(o -> o.getCurrentStatus() != OrderStatus.DELIVERED)
                    .findFirst()
                    .orElse(shipment.getAssignedOrders().get(0));
        }

        if (order == null) {
            throw new ResourceNotFoundException("No order associated with shipment #" + shipmentId);
        }

        if (order.getCurrentStatus() == OrderStatus.DELIVERED) {
            throw new BadRequestException("Order #" + order.getId() + " is already DELIVERED.");
        }

        if (order.getCurrentStatus() != OrderStatus.OUT_FOR_DELIVERY && shipment.getStatus() != ShipmentStatus.OUT_FOR_DELIVERY) {
            throw new BadRequestException("Delivery OTP can only be generated when the order or shipment is OUT_FOR_DELIVERY. Current status: " + order.getCurrentStatus() + " (Shipment: " + shipment.getStatus() + ")");
        }

        Long orderId = order.getId();
        String orderRef = order.getOrderReferenceNumber() != null ? order.getOrderReferenceNumber() : ("ORD-" + orderId);

        // 1. Check if active unexpired OTP already sent for this order
        OtpEntry existingEntry = retrieveOtpEntryByOrderId(orderId);
        if (existingEntry != null && !existingEntry.isExpired()) {
            boolean alreadySent = checkSentFlag(orderId);
            if (alreadySent) {
                log.info("Active Delivery OTP already dispatched for Order #{} (Shipment #{}). Skipping duplicate notification.", orderRef, shipment.getShipmentNumber());
                return DeliveryOtpResponse.builder()
                        .shipmentId(shipment.getId())
                        .orderId(order.getId())
                        .shipmentNumber(shipment.getShipmentNumber())
                        .customerEmail(order.getCustomerEmail())
                        .customerPhone(order.getCustomerPhone())
                        .maskedEmail(EmailNotificationService.maskEmail(order.getCustomerEmail()))
                        .maskedPhone(EmailNotificationService.maskPhone(order.getCustomerPhone()))
                        .status(order.getCurrentStatus().name())
                        .expiresInSeconds((int) existingEntry.getRemainingSeconds())
                        .message("Active Delivery PIN already sent. Please enter PIN or wait for code to expire.")
                        .verified(false)
                        .generatedAt(existingEntry.getGeneratedAt())
                        .build();
            }
        }

        // 2. Generate new 6-digit numeric OTP
        int pinNumber = 100000 + secureRandom.nextInt(900000);
        String otp = String.valueOf(pinNumber);
        String otpHashed = hashOtp(otp, orderId);

        long now = System.currentTimeMillis();
        long expiry = now + (OTP_TTL_SECONDS * 1000L);

        OtpEntry entry = OtpEntry.builder()
                .otpHashed(otpHashed)
                .plainOtpForDev(otp)
                .attempts(0)
                .expiryEpochMs(expiry)
                .shipmentId(shipment.getId())
                .orderId(orderId)
                .customerEmail(order.getCustomerEmail())
                .customerPhone(order.getCustomerPhone() != null ? order.getCustomerPhone() : "+91 98765 43210")
                .generatedAtIso(LocalDateTime.now().toString())
                .build();

        // 3. Store in cache / Redis
        saveOtpEntry(entry);
        markSentFlag(orderId);

        // 4. Dispatch only ONE email to customer
        emailNotificationService.sendDeliveryOtpEmail(
                order.getCustomerEmail(),
                order.getCustomerName(),
                orderRef,
                shipment.getShipmentNumber(),
                otp,
                OTP_TTL_SECONDS / 60
        );

        return DeliveryOtpResponse.builder()
                .shipmentId(shipment.getId())
                .orderId(order.getId())
                .shipmentNumber(shipment.getShipmentNumber())
                .customerEmail(order.getCustomerEmail())
                .customerPhone(order.getCustomerPhone())
                .maskedEmail(EmailNotificationService.maskEmail(order.getCustomerEmail()))
                .maskedPhone(EmailNotificationService.maskPhone(order.getCustomerPhone()))
                .status(order.getCurrentStatus().name())
                .expiresInSeconds(OTP_TTL_SECONDS)
                .message("Secure 6-digit Delivery PIN dispatched to customer email.")
                .verified(false)
                .generatedAt(LocalDateTime.now())
                .build();
    }

    /**
     * Verifies the submitted Delivery PIN / OTP and transitions shipment and order to DELIVERED.
     */
    public DeliveryOtpResponse verifyDeliveryOtp(Long shipmentId, String rawOtp, Long staffId, String staffUsername) {
        return verifyDeliveryOtp(shipmentId, null, rawOtp, staffId, staffUsername);
    }

    @Transactional
    public DeliveryOtpResponse verifyDeliveryOtp(Long shipmentId, Long targetOrderId, String rawOtp, Long staffId, String staffUsername) {
        if (rawOtp == null || rawOtp.trim().isEmpty()) {
            throw new BadRequestException("Delivery OTP is required.");
        }

        String cleanedOtp = rawOtp.trim();

        Shipment shipment = shipmentRepository.findById(shipmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment not found with ID: " + shipmentId));

        OperationalOrder order = null;
        if (targetOrderId != null) {
            order = orderRepository.findByDjangoOrderId(targetOrderId)
                    .or(() -> orderRepository.findById(targetOrderId))
                    .orElse(null);
        }
        if (order == null && shipment.getOrderId() != null) {
            order = orderRepository.findById(shipment.getOrderId()).orElse(null);
        }
        if (order == null && shipment.getAssignedOrders() != null && !shipment.getAssignedOrders().isEmpty()) {
            order = shipment.getAssignedOrders().stream()
                    .filter(o -> o.getCurrentStatus() != OrderStatus.DELIVERED)
                    .findFirst()
                    .orElse(shipment.getAssignedOrders().get(0));
        }

        if (order == null) {
            throw new ResourceNotFoundException("No order found associated with shipment #" + shipmentId);
        }

        if (order.getCurrentStatus() == OrderStatus.DELIVERED) {
            throw new BadRequestException("Order #" + order.getId() + " is already DELIVERED.");
        }

        if (order.getCurrentStatus() != OrderStatus.OUT_FOR_DELIVERY && shipment.getStatus() != ShipmentStatus.OUT_FOR_DELIVERY) {
            throw new BadRequestException("Delivery OTP can only be verified when the order or shipment is OUT_FOR_DELIVERY. Current status: " + order.getCurrentStatus() + " (Shipment: " + shipment.getStatus() + ")");
        }

        Long orderId = order.getId();
        OtpEntry entry = retrieveOtpEntryByOrderId(orderId);
        if (entry == null) {
            entry = retrieveOtpEntryByShipmentId(shipmentId);
        }

        if (entry == null || entry.isExpired()) {
            clearOtpEntry(orderId, shipmentId);
            throw new BadRequestException("Delivery OTP has expired or does not exist. Please request a new OTP.");
        }

        if (entry.getAttempts() >= MAX_ATTEMPTS) {
            clearOtpEntry(orderId, shipmentId);
            throw new BadRequestException("Maximum verification attempts (" + MAX_ATTEMPTS + ") exceeded. OTP has been locked. Please request a new OTP.");
        }

        String computedHash = hashOtp(cleanedOtp, orderId);
        boolean matches = (entry.getOtpHashed() != null && entry.getOtpHashed().equals(computedHash))
                || (entry.getPlainOtpForDev() != null && entry.getPlainOtpForDev().equals(cleanedOtp));

        if (!matches) {
            entry.setAttempts(entry.getAttempts() + 1);
            saveOtpEntry(entry);
            int remaining = MAX_ATTEMPTS - entry.getAttempts();
            if (remaining <= 0) {
                clearOtpEntry(orderId, shipmentId);
                throw new BadRequestException("Invalid Delivery OTP. Maximum attempts exceeded. OTP locked.");
            }
            throw new BadRequestException("Invalid Delivery OTP. " + remaining + " attempts remaining.");
        }

        // OTP is valid! Invalidate the OTP token immediately (prevent replay)
        clearOtpEntry(orderId, shipmentId);

        // Record Delivery Verification Audit
        OrderStatus prevStatus = order.getCurrentStatus();
        DeliveryVerificationAudit audit = DeliveryVerificationAudit.builder()
                .orderId(order.getId())
                .shipmentId(shipment.getId())
                .customerId(order.getCustomerId())
                .verifiedBy(staffUsername != null ? staffUsername : "DELIVERY_AGENT")
                .verificationMethod("CUSTOMER_OTP_EMAIL")
                .verificationTimestamp(LocalDateTime.now())
                .previousOrderStatus(prevStatus != null ? prevStatus.name() : "OUT_FOR_DELIVERY")
                .newOrderStatus(OrderStatus.DELIVERED.name())
                .deliveryAttemptInfo("Verified via 6-digit cryptographic OTP by staff: " + (staffUsername != null ? staffUsername : "DELIVERY_AGENT"))
                .build();
        deliveryVerificationAuditRepository.save(audit);

        // Transition Order to DELIVERED
        order.setCurrentStatus(OrderStatus.DELIVERED);
        order.setDeliveredAt(LocalDateTime.now());
        orderRepository.save(order);

        OrderStatusTransition transition = OrderStatusTransition.builder()
                .orderId(order.getId())
                .fromStatus(prevStatus)
                .toStatus(OrderStatus.DELIVERED)
                .reasonNote("Customer Delivery PIN verified successfully.")
                .staffId(staffId)
                .staffUsername(staffUsername != null ? staffUsername : "DELIVERY_AGENT")
                .build();
        transitionRepository.save(transition);

        djangoOrderSyncService.syncOrderStatusToDjango(
                order.getDjangoOrderId() != null ? order.getDjangoOrderId() : order.getId(),
                OrderStatus.DELIVERED,
                shipment.getShipmentNumber(),
                shipment.getTrackingNumber(),
                shipment.getCarrierName(),
                "PAID"
        );

        // Check if all assigned orders in shipment are now delivered
        boolean allDelivered = shipment.getAssignedOrders() == null || shipment.getAssignedOrders().isEmpty()
                || shipment.getAssignedOrders().stream().allMatch(o -> o.getCurrentStatus() == OrderStatus.DELIVERED || o.getId().equals(orderId));

        if (allDelivered) {
            shipmentService.updateShipmentStatus(
                    shipmentId,
                    ShipmentStatus.DELIVERED,
                    staffId,
                    staffUsername != null ? staffUsername : "DELIVERY_AGENT"
            );
        }

        // Broadcast real-time STOMP event so customer order page and admin update instantly without refresh
        if (messagingTemplate != null) {
            try {
                ShipmentStatusWsMessage wsMsg = ShipmentStatusWsMessage.builder()
                        .eventType("SHIPMENT_STATUS_UPDATED")
                        .shipmentId(shipment.getId())
                        .shipmentNumber(shipment.getShipmentNumber())
                        .orderId(order.getId())
                        .status("DELIVERED")
                        .carrierName(shipment.getCarrierName())
                        .trackingNumber(shipment.getTrackingNumber())
                        .timestamp(LocalDateTime.now())
                        .build();

                messagingTemplate.convertAndSend("/topic/orders/" + order.getId(), wsMsg);
                if (order.getDjangoOrderId() != null && !order.getDjangoOrderId().equals(order.getId())) {
                    messagingTemplate.convertAndSend("/topic/orders/" + order.getDjangoOrderId(), wsMsg);
                }
                messagingTemplate.convertAndSend("/topic/shipments/" + shipment.getId(), wsMsg);
                messagingTemplate.convertAndSend("/topic/fulfillment/activity", wsMsg);
                messagingTemplate.convertAndSend("/topic/fulfillment/analytics", wsMsg);
            } catch (Exception ex) {
                log.warn("Failed to broadcast STOMP delivery update for order #{}: {}", order.getId(), ex.getMessage());
            }
        }

        log.info("Delivery OTP verified successfully for Order #{} on Shipment #{}.", order.getId(), shipment.getShipmentNumber());

        return DeliveryOtpResponse.builder()
                .shipmentId(shipment.getId())
                .orderId(order.getId())
                .shipmentNumber(shipment.getShipmentNumber())
                .customerEmail(entry.getCustomerEmail())
                .customerPhone(entry.getCustomerPhone())
                .maskedEmail(EmailNotificationService.maskEmail(entry.getCustomerEmail()))
                .maskedPhone(EmailNotificationService.maskPhone(entry.getCustomerPhone()))
                .status(OrderStatus.DELIVERED.name())
                .expiresInSeconds(0)
                .message("Delivery verification successful! Order #" + order.getId() + " marked DELIVERED.")
                .verified(true)
                .generatedAt(LocalDateTime.now())
                .build();
    }

    /**
     * Checks if an active OTP is pending verification for a shipment.
     */
    public DeliveryOtpResponse getOtpStatus(Long shipmentId) {
        Shipment shipment = shipmentRepository.findById(shipmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment not found with ID: " + shipmentId));

        Long orderId = shipment.getOrderId();
        OtpEntry entry = null;
        if (orderId != null) {
            entry = retrieveOtpEntryByOrderId(orderId);
        }
        if (entry == null && shipment.getAssignedOrders() != null) {
            for (OperationalOrder o : shipment.getAssignedOrders()) {
                if (o.getCurrentStatus() != OrderStatus.DELIVERED) {
                    entry = retrieveOtpEntryByOrderId(o.getId());
                    if (entry != null) {
                        orderId = o.getId();
                        break;
                    }
                }
            }
        }
        if (entry == null) {
            entry = retrieveOtpEntryByShipmentId(shipmentId);
        }

        OperationalOrder order = orderId != null ? orderRepository.findById(orderId).orElse(null) : null;
        if (order == null && entry != null && entry.getOrderId() != null) {
            order = orderRepository.findById(entry.getOrderId()).orElse(null);
            orderId = entry.getOrderId();
        }

        if (entry == null || entry.isExpired()) {
            return DeliveryOtpResponse.builder()
                    .shipmentId(shipment.getId())
                    .orderId(orderId)
                    .shipmentNumber(shipment.getShipmentNumber())
                    .customerEmail(order != null ? order.getCustomerEmail() : "")
                    .customerPhone(order != null ? order.getCustomerPhone() : "")
                    .maskedEmail(order != null ? EmailNotificationService.maskEmail(order.getCustomerEmail()) : "***")
                    .maskedPhone(order != null ? EmailNotificationService.maskPhone(order.getCustomerPhone()) : "***")
                    .status(shipment.getStatus().name())
                    .expiresInSeconds(0)
                    .message("No active Delivery PIN pending.")
                    .verified(shipment.getStatus() == ShipmentStatus.DELIVERED)
                    .build();
        }

        return DeliveryOtpResponse.builder()
                .shipmentId(shipment.getId())
                .orderId(orderId)
                .shipmentNumber(shipment.getShipmentNumber())
                .customerEmail(entry.getCustomerEmail())
                .customerPhone(entry.getCustomerPhone())
                .maskedEmail(EmailNotificationService.maskEmail(entry.getCustomerEmail()))
                .maskedPhone(EmailNotificationService.maskPhone(entry.getCustomerPhone()))
                .status(shipment.getStatus().name())
                .expiresInSeconds((int) entry.getRemainingSeconds())
                .message("Active Delivery PIN pending verification. Remaining time: " + entry.getRemainingSeconds() + "s")
                .verified(false)
                .generatedAt(entry.getGeneratedAt())
                .build();
    }

    private void saveOtpEntry(OtpEntry entry) {
        if (entry.getOrderId() != null) {
            inMemoryOrderOtpStore.put(entry.getOrderId(), entry);
        }
        if (entry.getShipmentId() != null) {
            inMemoryShipmentOtpStore.put(entry.getShipmentId(), entry);
        }

        if (redisTemplate != null) {
            try {
                String json = objectMapper.writeValueAsString(entry);
                if (entry.getOrderId() != null) {
                    redisTemplate.opsForValue().set(REDIS_ORDER_KEY_PREFIX + entry.getOrderId(), json, Duration.ofSeconds(OTP_TTL_SECONDS));
                }
                if (entry.getShipmentId() != null) {
                    redisTemplate.opsForValue().set(REDIS_SHIPMENT_KEY_PREFIX + entry.getShipmentId(), json, Duration.ofSeconds(OTP_TTL_SECONDS));
                }
            } catch (Exception ex) {
                log.warn("Redis write skipped for OTP (in-memory cache used): {}", ex.getMessage());
            }
        }
    }

    private OtpEntry retrieveOtpEntryByOrderId(Long orderId) {
        if (orderId == null) return null;
        if (redisTemplate != null) {
            try {
                String json = redisTemplate.opsForValue().get(REDIS_ORDER_KEY_PREFIX + orderId);
                if (json != null && !json.isBlank()) {
                    return objectMapper.readValue(json, OtpEntry.class);
                }
            } catch (Exception ex) {
                log.warn("Redis read skipped for OTP: {}", ex.getMessage());
            }
        }
        return inMemoryOrderOtpStore.get(orderId);
    }

    private OtpEntry retrieveOtpEntryByShipmentId(Long shipmentId) {
        if (shipmentId == null) return null;
        if (redisTemplate != null) {
            try {
                String json = redisTemplate.opsForValue().get(REDIS_SHIPMENT_KEY_PREFIX + shipmentId);
                if (json != null && !json.isBlank()) {
                    return objectMapper.readValue(json, OtpEntry.class);
                }
            } catch (Exception ex) {
                log.warn("Redis read skipped for OTP: {}", ex.getMessage());
            }
        }
        return inMemoryShipmentOtpStore.get(shipmentId);
    }

    private void clearOtpEntry(Long orderId, Long shipmentId) {
        if (orderId != null) {
            inMemoryOrderOtpStore.remove(orderId);
            inMemorySentStore.remove(REDIS_SENT_KEY_PREFIX + orderId);
            if (redisTemplate != null) {
                try {
                    redisTemplate.delete(REDIS_ORDER_KEY_PREFIX + orderId);
                    redisTemplate.delete(REDIS_SENT_KEY_PREFIX + orderId);
                } catch (Exception ignored) {}
            }
        }
        if (shipmentId != null) {
            inMemoryShipmentOtpStore.remove(shipmentId);
            if (redisTemplate != null) {
                try {
                    redisTemplate.delete(REDIS_SHIPMENT_KEY_PREFIX + shipmentId);
                } catch (Exception ignored) {}
            }
        }
    }

    private boolean checkSentFlag(Long orderId) {
        if (orderId == null) return false;
        if (redisTemplate != null) {
            try {
                Boolean hasKey = redisTemplate.hasKey(REDIS_SENT_KEY_PREFIX + orderId);
                if (Boolean.TRUE.equals(hasKey)) return true;
            } catch (Exception ignored) {}
        }
        Long sentAt = inMemorySentStore.get(REDIS_SENT_KEY_PREFIX + orderId);
        return sentAt != null && (System.currentTimeMillis() - sentAt < OTP_TTL_SECONDS * 1000L);
    }

    private void markSentFlag(Long orderId) {
        if (orderId == null) return;
        inMemorySentStore.put(REDIS_SENT_KEY_PREFIX + orderId, System.currentTimeMillis());
        if (redisTemplate != null) {
            try {
                redisTemplate.opsForValue().set(REDIS_SENT_KEY_PREFIX + orderId, "1", Duration.ofSeconds(OTP_TTL_SECONDS));
            } catch (Exception ignored) {}
        }
    }
}
