package com.econext.order.service;

import com.econext.order.dto.DeliveryOtpResponse;
import com.econext.order.dto.ShipmentResponse;
import com.econext.order.entity.OperationalOrder;
import com.econext.order.entity.Shipment;
import com.econext.order.entity.ShipmentStatus;
import com.econext.order.exception.GlobalExceptionHandler.BadRequestException;
import com.econext.order.exception.GlobalExceptionHandler.ResourceNotFoundException;
import com.econext.order.repository.OperationalOrderRepository;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
public class DeliveryOtpService {

    private static final int OTP_LENGTH = 6;
    private static final int OTP_TTL_SECONDS = 600; // 10 minutes
    private static final int MAX_ATTEMPTS = 5;
    private static final String REDIS_KEY_PREFIX = "shipment:delivery:otp:";

    private final SecureRandom secureRandom = new SecureRandom();
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    private final ShipmentRepository shipmentRepository;
    private final OperationalOrderRepository orderRepository;
    private final EmailNotificationService emailNotificationService;
    private final ShipmentService shipmentService;

    @Autowired(required = false)
    private StringRedisTemplate redisTemplate;

    // High-performance thread-safe in-memory cache fallback if Redis is unavailable/offline
    private final Map<Long, OtpEntry> inMemoryOtpStore = new ConcurrentHashMap<>();

    public DeliveryOtpService(
            ShipmentRepository shipmentRepository,
            OperationalOrderRepository orderRepository,
            EmailNotificationService emailNotificationService,
            @Lazy ShipmentService shipmentService
    ) {
        this.shipmentRepository = shipmentRepository;
        this.orderRepository = orderRepository;
        this.emailNotificationService = emailNotificationService;
        this.shipmentService = shipmentService;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties(ignoreUnknown = true)
    public static class OtpEntry {
        private String otp;
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
     * Generates and dispatches a 6-digit Delivery PIN / OTP for a shipment.
     */
    @Transactional
    public DeliveryOtpResponse generateAndSendOtp(Long shipmentId, Long staffId, String staffUsername) {
        Shipment shipment = shipmentRepository.findById(shipmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment not found with ID: " + shipmentId));

        OperationalOrder order = orderRepository.findById(shipment.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + shipment.getOrderId()));

        if (shipment.getStatus() == ShipmentStatus.DELIVERED) {
            throw new BadRequestException("Shipment #" + shipment.getShipmentNumber() + " is already DELIVERED.");
        }

        // Generate 6-digit numeric OTP
        int pinNumber = 100000 + secureRandom.nextInt(900000);
        String otp = String.valueOf(pinNumber);

        long now = System.currentTimeMillis();
        long expiry = now + (OTP_TTL_SECONDS * 1000L);

        OtpEntry entry = OtpEntry.builder()
                .otp(otp)
                .attempts(0)
                .expiryEpochMs(expiry)
                .shipmentId(shipment.getId())
                .orderId(order.getId())
                .customerEmail(order.getCustomerEmail())
                .customerPhone(order.getCustomerPhone() != null ? order.getCustomerPhone() : "+91 98765 43210")
                .generatedAtIso(LocalDateTime.now().toString())
                .build();

        // 1. Store in in-memory fallback
        inMemoryOtpStore.put(shipment.getId(), entry);

        // 2. Store in Redis if available
        if (redisTemplate != null) {
            try {
                String redisKey = REDIS_KEY_PREFIX + shipment.getId();
                String json = objectMapper.writeValueAsString(entry);
                redisTemplate.opsForValue().set(redisKey, json, Duration.ofSeconds(OTP_TTL_SECONDS));
                log.info("Persisted Delivery OTP to Redis: key={}", redisKey);
            } catch (Exception ex) {
                log.warn("Redis write skipped for OTP (using in-memory store): {}", ex.getMessage());
            }
        }

        // 3. Dispatch Email Notification
        String orderRef = order.getOrderReferenceNumber() != null ? order.getOrderReferenceNumber() : ("ORD-" + order.getId());
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
                .status(shipment.getStatus().name())
                .expiresInSeconds(OTP_TTL_SECONDS)
                .message("Secure 6-digit Delivery PIN dispatched to customer email.")
                .verified(false)
                .generatedAt(LocalDateTime.now())
                .build();
    }

    /**
     * Verifies the submitted Delivery PIN / OTP and transitions the shipment and order to DELIVERED.
     */
    @Transactional
    public DeliveryOtpResponse verifyDeliveryOtp(Long shipmentId, String rawOtp, Long staffId, String staffUsername) {
        if (rawOtp == null || rawOtp.trim().isEmpty()) {
            throw new BadRequestException("Delivery PIN / OTP is required.");
        }

        String cleanedOtp = rawOtp.trim();
        OtpEntry entry = retrieveOtpEntry(shipmentId);

        if (entry == null || entry.isExpired()) {
            inMemoryOtpStore.remove(shipmentId);
            deleteFromRedis(shipmentId);
            throw new BadRequestException("Delivery PIN has expired or does not exist. Please request a new PIN.");
        }

        if (entry.getAttempts() >= MAX_ATTEMPTS) {
            inMemoryOtpStore.remove(shipmentId);
            deleteFromRedis(shipmentId);
            throw new BadRequestException("Maximum verification attempts (" + MAX_ATTEMPTS + ") exceeded. PIN has been locked. Please request a new PIN.");
        }

        if (!entry.getOtp().equals(cleanedOtp)) {
            entry.setAttempts(entry.getAttempts() + 1);
            saveOtpEntry(entry);
            int remaining = MAX_ATTEMPTS - entry.getAttempts();
            if (remaining <= 0) {
                inMemoryOtpStore.remove(shipmentId);
                deleteFromRedis(shipmentId);
                throw new BadRequestException("Invalid Delivery PIN. Maximum attempts exceeded. PIN locked.");
            }
            throw new BadRequestException("Invalid Delivery PIN. " + remaining + " attempts remaining.");
        }

        // OTP is valid! Invalidate the OTP token immediately (prevent replay)
        inMemoryOtpStore.remove(shipmentId);
        deleteFromRedis(shipmentId);

        // Transition Shipment status to DELIVERED
        ShipmentResponse updatedShipment = shipmentService.updateShipmentStatus(
                shipmentId,
                ShipmentStatus.DELIVERED,
                staffId,
                staffUsername != null ? staffUsername : "DELIVERY_AGENT"
        );

        log.info("Delivery PIN verified successfully for Shipment #{} (Order #{}). Status transitioned to DELIVERED.",
                updatedShipment.getShipmentNumber(), updatedShipment.getOrderId());

        return DeliveryOtpResponse.builder()
                .shipmentId(updatedShipment.getId())
                .orderId(updatedShipment.getOrderId())
                .shipmentNumber(updatedShipment.getShipmentNumber())
                .customerEmail(entry.getCustomerEmail())
                .customerPhone(entry.getCustomerPhone())
                .maskedEmail(EmailNotificationService.maskEmail(entry.getCustomerEmail()))
                .maskedPhone(EmailNotificationService.maskPhone(entry.getCustomerPhone()))
                .status(ShipmentStatus.DELIVERED.name())
                .expiresInSeconds(0)
                .message("Delivery PIN successfully verified! Shipment #" + updatedShipment.getShipmentNumber() + " marked DELIVERED.")
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

        OtpEntry entry = retrieveOtpEntry(shipmentId);
        boolean active = entry != null && !entry.isExpired() && entry.getAttempts() < MAX_ATTEMPTS;

        OperationalOrder order = orderRepository.findById(shipment.getOrderId()).orElse(null);
        String email = order != null ? order.getCustomerEmail() : "";
        String phone = order != null ? order.getCustomerPhone() : "";

        return DeliveryOtpResponse.builder()
                .shipmentId(shipment.getId())
                .orderId(shipment.getOrderId())
                .shipmentNumber(shipment.getShipmentNumber())
                .customerEmail(email)
                .customerPhone(phone)
                .maskedEmail(EmailNotificationService.maskEmail(email))
                .maskedPhone(EmailNotificationService.maskPhone(phone))
                .status(shipment.getStatus().name())
                .expiresInSeconds(active ? entry.getRemainingSeconds() : 0)
                .message(active ? "Active Delivery PIN pending verification." : "No active PIN pending.")
                .verified(shipment.getStatus() == ShipmentStatus.DELIVERED)
                .generatedAt(entry != null ? entry.getGeneratedAt() : null)
                .build();
    }

    private OtpEntry retrieveOtpEntry(Long shipmentId) {
        if (redisTemplate != null) {
            try {
                String redisKey = REDIS_KEY_PREFIX + shipmentId;
                String json = redisTemplate.opsForValue().get(redisKey);
                if (json != null && !json.isBlank()) {
                    return objectMapper.readValue(json, OtpEntry.class);
                }
            } catch (Exception ex) {
                log.warn("Redis read skipped for OTP: {}", ex.getMessage());
            }
        }
        return inMemoryOtpStore.get(shipmentId);
    }

    private void saveOtpEntry(OtpEntry entry) {
        inMemoryOtpStore.put(entry.getShipmentId(), entry);
        if (redisTemplate != null) {
            try {
                String redisKey = REDIS_KEY_PREFIX + entry.getShipmentId();
                String json = objectMapper.writeValueAsString(entry);
                long ttl = entry.getRemainingSeconds();
                if (ttl > 0) {
                    redisTemplate.opsForValue().set(redisKey, json, Duration.ofSeconds(ttl));
                }
            } catch (Exception ex) {
                log.warn("Redis write failed: {}", ex.getMessage());
            }
        }
    }

    private void deleteFromRedis(Long shipmentId) {
        if (redisTemplate != null) {
            try {
                redisTemplate.delete(REDIS_KEY_PREFIX + shipmentId);
            } catch (Exception ignored) {
            }
        }
    }
}
