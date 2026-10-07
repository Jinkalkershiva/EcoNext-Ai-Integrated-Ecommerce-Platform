package com.econext.payment.service;

import com.econext.payment.dto.*;
import com.econext.payment.entity.PaymentTransaction;
import com.econext.payment.entity.RefundTransaction;
import com.econext.payment.exception.BadRequestException;
import com.econext.payment.exception.ResourceNotFoundException;
import com.econext.payment.kafka.PaymentEventProducer;
import com.econext.payment.repository.PaymentRepository;
import com.econext.payment.repository.RefundRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentServiceImpl implements PaymentService {

    private final PaymentRepository paymentRepository;
    private final RefundRepository refundRepository;
    private final RazorpayService razorpayService;
    private final PaymentEventProducer paymentEventProducer;

    @Override
    @Transactional
    public PaymentResponse createPaymentOrder(CreatePaymentRequest request, Long userId) {
        log.info("Initiating payment for orderId {} by userId {}, amount: {}", request.getOrderId(), userId, request.getAmount());

        // Check if transaction already exists for this order or checkout attempt
        PaymentTransaction transaction = (request.getOrderId() != null
                ? paymentRepository.findByOrderId(request.getOrderId())
                : java.util.Optional.<PaymentTransaction>empty())
                .orElseGet(() -> PaymentTransaction.builder()
                        .orderId(request.getOrderId())
                        .userId(userId)
                        .amount(request.getAmount())
                        .currency(request.getCurrency() != null ? request.getCurrency() : "INR")
                        .status("CREATED")
                        .paymentMethod(request.getPaymentMethod() != null ? request.getPaymentMethod() : "RAZORPAY")
                        .build());

        // Generate Razorpay Order
        String rzpOrderId = razorpayService.createRazorpayOrder(
                request.getOrderId() != null ? request.getOrderId() : System.currentTimeMillis(),
                request.getAmount(),
                request.getCurrency()
        );

        transaction.setRazorpayOrderId(rzpOrderId);
        transaction.setStatus("PENDING");
        PaymentTransaction saved = paymentRepository.save(transaction);

        return mapToResponse(saved, razorpayService.getKeyId());
    }

    @Override
    @Transactional
    public PaymentResponse verifyPayment(VerifyPaymentRequest request, Long userId) {
        log.info("Verifying Razorpay payment for orderId: {}, razorpayOrderId: {}, paymentId: {}",
                request.getOrderId(), request.getRazorpayOrderId(), request.getRazorpayPaymentId());

        PaymentTransaction transaction = (request.getOrderId() != null
                ? paymentRepository.findByOrderId(request.getOrderId())
                : java.util.Optional.<PaymentTransaction>empty())
                .or(() -> paymentRepository.findByRazorpayOrderId(request.getRazorpayOrderId()))
                .orElseGet(() -> PaymentTransaction.builder()
                        .orderId(request.getOrderId())
                        .userId(userId)
                        .razorpayOrderId(request.getRazorpayOrderId())
                        .status("PENDING")
                        .currency("INR")
                        .paymentMethod("RAZORPAY")
                        .build());

        if (transaction.getUserId() != null && !transaction.getUserId().equals(userId)) {
            throw new BadRequestException("Unauthorized attempt to verify payment for another user's order");
        }

        boolean isValid = razorpayService.verifySignature(
                request.getRazorpayOrderId(),
                request.getRazorpayPaymentId(),
                request.getRazorpaySignature()
        );

        if (isValid) {
            transaction.setRazorpayPaymentId(request.getRazorpayPaymentId());
            transaction.setRazorpaySignature(request.getRazorpaySignature());
            transaction.setStatus("SUCCESS");
            transaction.setErrorMessage(null);
            log.info("Payment signature VERIFIED SUCCESS for orderId: {}", request.getOrderId());
        } else {
            transaction.setStatus("FAILED");
            transaction.setErrorMessage("Cryptographic signature verification failed");
            log.warn("Payment signature verification FAILED for orderId: {}", request.getOrderId());
        }

        PaymentTransaction saved = paymentRepository.save(transaction);

        // Publish event to Kafka for Notification Service and Order consumer
        paymentEventProducer.publishPaymentEvent(PaymentEvent.builder()
                .orderId(saved.getOrderId())
                .userId(saved.getUserId())
                .amount(saved.getAmount())
                .currency(saved.getCurrency())
                .status(saved.getStatus())
                .paymentMethod(saved.getPaymentMethod())
                .razorpayPaymentId(saved.getRazorpayPaymentId())
                .errorMessage(saved.getErrorMessage())
                .timestamp(LocalDateTime.now())
                .build());

        if (!isValid) {
            throw new BadRequestException("Payment verification failed: invalid signature");
        }

        return mapToResponse(saved, razorpayService.getKeyId());
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentResponse getPaymentByOrderId(Long orderId, Long userId) {
        PaymentTransaction transaction = paymentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment transaction not found for order: " + orderId));

        if (!transaction.getUserId().equals(userId)) {
            throw new BadRequestException("Access denied to order payment");
        }

        return mapToResponse(transaction, razorpayService.getKeyId());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PaymentResponse> getUserPayments(Long userId) {
        return paymentRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(t -> mapToResponse(t, razorpayService.getKeyId()))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PaymentResponse> getAllPaymentsAdmin() {
        return paymentRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(t -> mapToResponse(t, razorpayService.getKeyId()))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public RefundResponse initiateRefund(CreateRefundRequest request, Long userId) {
        log.info("Initiating refund for orderId: {}, amount: {}, reason: {}", request.getOrderId(), request.getAmount(), request.getReason());

        // 1. Idempotency Check: check if refund with this key or successful refund for this order already exists
        String idempotencyKey = request.getIdempotencyKey();
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<RefundTransaction> existing = refundRepository.findByIdempotencyKey(idempotencyKey);
            if (existing.isPresent()) {
                log.info("Idempotent request detected via key {}. Returning existing refund #{}", idempotencyKey, existing.get().getRefundId());
                return mapToRefundResponse(existing.get());
            }
        } else {
            // Derive deterministic business idempotency key from order ID
            idempotencyKey = "REFUND-ORD-" + request.getOrderId();
        }

        // Check if an active/successful refund already exists for this order
        List<RefundTransaction> existingForOrder = refundRepository.findByOrderId(request.getOrderId());
        Optional<RefundTransaction> activeRefund = existingForOrder.stream()
                .filter(r -> "SUCCESS".equals(r.getStatus()) || "PROCESSING".equals(r.getStatus()))
                .findFirst();
        if (activeRefund.isPresent()) {
            log.info("Active refund already exists for Order #{}. Returning existing refund #{}", request.getOrderId(), activeRefund.get().getRefundId());
            return mapToRefundResponse(activeRefund.get());
        }

        // 2. Find payment transaction for the order
        Optional<PaymentTransaction> paymentOpt = request.getPaymentId() != null
                ? paymentRepository.findById(request.getPaymentId())
                : paymentRepository.findByOrderId(request.getOrderId());

        PaymentTransaction payment = paymentOpt.orElse(null);
        String razorpayPaymentId = request.getRazorpayPaymentId();
        if (razorpayPaymentId == null && payment != null) {
            razorpayPaymentId = payment.getRazorpayPaymentId();
        }

        String refundId = "REF-" + request.getOrderId() + "-" + System.currentTimeMillis();

        RefundTransaction refund = RefundTransaction.builder()
                .refundId(refundId)
                .orderId(request.getOrderId())
                .paymentId(payment != null ? payment.getId() : request.getPaymentId())
                .userId(userId)
                .razorpayPaymentId(razorpayPaymentId)
                .amount(request.getAmount())
                .currency(request.getCurrency() != null ? request.getCurrency() : "INR")
                .status("PROCESSING")
                .reason(request.getReason() != null ? request.getReason() : "Customer cancellation / Return refund")
                .idempotencyKey(idempotencyKey)
                .retryCount(0)
                .build();

        RefundTransaction savedRefund = refundRepository.save(refund);

        // 3. Execute refund with Razorpay provider
        try {
            String providerRefundId = razorpayService.processRefund(
                    razorpayPaymentId,
                    request.getAmount(),
                    request.getReason(),
                    idempotencyKey
            );

            savedRefund.setStatus("SUCCESS");
            savedRefund.setProviderRefundId(providerRefundId);
            savedRefund.setProcessedAt(LocalDateTime.now());
            savedRefund.setFailureReason(null);
            log.info("Refund SUCCESS for order #{}, providerRefundId: {}", request.getOrderId(), providerRefundId);

            // Update payment transaction if available
            if (payment != null) {
                payment.setStatus("REFUNDED");
                paymentRepository.save(payment);
            }

            // Publish Kafka event
            paymentEventProducer.publishPaymentEvent(PaymentEvent.builder()
                    .orderId(savedRefund.getOrderId())
                    .userId(savedRefund.getUserId())
                    .amount(savedRefund.getAmount())
                    .currency(savedRefund.getCurrency())
                    .status("REFUND_SUCCESS")
                    .paymentMethod("RAZORPAY_REFUND")
                    .razorpayPaymentId(savedRefund.getRazorpayPaymentId())
                    .errorMessage(null)
                    .timestamp(LocalDateTime.now())
                    .build());

        } catch (Exception ex) {
            log.error("Refund FAILED for order #{}: {}", request.getOrderId(), ex.getMessage());
            savedRefund.setStatus("FAILED");
            savedRefund.setFailureReason(ex.getMessage());

            // Publish Kafka event
            paymentEventProducer.publishPaymentEvent(PaymentEvent.builder()
                    .orderId(savedRefund.getOrderId())
                    .userId(savedRefund.getUserId())
                    .amount(savedRefund.getAmount())
                    .currency(savedRefund.getCurrency())
                    .status("REFUND_FAILED")
                    .paymentMethod("RAZORPAY_REFUND")
                    .razorpayPaymentId(savedRefund.getRazorpayPaymentId())
                    .errorMessage(ex.getMessage())
                    .timestamp(LocalDateTime.now())
                    .build());
        }

        RefundTransaction finalSaved = refundRepository.save(savedRefund);
        return mapToRefundResponse(finalSaved);
    }

    @Override
    @Transactional
    public RefundResponse retryRefund(Long refundId, Long userId) {
        RefundTransaction refund = refundRepository.findById(refundId)
                .orElseThrow(() -> new ResourceNotFoundException("Refund transaction not found with ID: " + refundId));

        if ("SUCCESS".equals(refund.getStatus())) {
            return mapToRefundResponse(refund);
        }

        refund.setRetryCount(refund.getRetryCount() + 1);
        refund.setStatus("PROCESSING");
        refundRepository.save(refund);

        try {
            String providerRefundId = razorpayService.processRefund(
                    refund.getRazorpayPaymentId(),
                    refund.getAmount(),
                    refund.getReason(),
                    refund.getIdempotencyKey()
            );

            refund.setStatus("SUCCESS");
            refund.setProviderRefundId(providerRefundId);
            refund.setProcessedAt(LocalDateTime.now());
            refund.setFailureReason(null);
            log.info("Retry refund SUCCESS for order #{}, providerRefundId: {}", refund.getOrderId(), providerRefundId);

            paymentEventProducer.publishPaymentEvent(PaymentEvent.builder()
                    .orderId(refund.getOrderId())
                    .userId(refund.getUserId())
                    .amount(refund.getAmount())
                    .currency(refund.getCurrency())
                    .status("REFUND_SUCCESS")
                    .paymentMethod("RAZORPAY_REFUND")
                    .razorpayPaymentId(refund.getRazorpayPaymentId())
                    .errorMessage(null)
                    .timestamp(LocalDateTime.now())
                    .build());

        } catch (Exception ex) {
            log.error("Retry refund FAILED for order #{}: {}", refund.getOrderId(), ex.getMessage());
            refund.setStatus("FAILED");
            refund.setFailureReason(ex.getMessage());

            paymentEventProducer.publishPaymentEvent(PaymentEvent.builder()
                    .orderId(refund.getOrderId())
                    .userId(refund.getUserId())
                    .amount(refund.getAmount())
                    .currency(refund.getCurrency())
                    .status("REFUND_FAILED")
                    .paymentMethod("RAZORPAY_REFUND")
                    .razorpayPaymentId(refund.getRazorpayPaymentId())
                    .errorMessage(ex.getMessage())
                    .timestamp(LocalDateTime.now())
                    .build());
        }

        RefundTransaction updated = refundRepository.save(refund);
        return mapToRefundResponse(updated);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RefundResponse> getRefundsByOrderId(Long orderId) {
        return refundRepository.findByOrderId(orderId).stream()
                .map(this::mapToRefundResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<RefundResponse> getAllRefundsAdmin() {
        return refundRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToRefundResponse)
                .collect(Collectors.toList());
    }

    private PaymentResponse mapToResponse(PaymentTransaction t, String keyId) {
        return PaymentResponse.builder()
                .id(t.getId())
                .orderId(t.getOrderId())
                .userId(t.getUserId())
                .razorpayOrderId(t.getRazorpayOrderId())
                .razorpayPaymentId(t.getRazorpayPaymentId())
                .razorpayKeyId(keyId)
                .amount(t.getAmount())
                .currency(t.getCurrency())
                .status(t.getStatus())
                .paymentMethod(t.getPaymentMethod())
                .errorMessage(t.getErrorMessage())
                .createdAt(t.getCreatedAt())
                .build();
    }

    private RefundResponse mapToRefundResponse(RefundTransaction r) {
        return RefundResponse.builder()
                .id(r.getId())
                .refundId(r.getRefundId())
                .orderId(r.getOrderId())
                .paymentId(r.getPaymentId())
                .userId(r.getUserId())
                .razorpayPaymentId(r.getRazorpayPaymentId())
                .providerRefundId(r.getProviderRefundId())
                .amount(r.getAmount())
                .currency(r.getCurrency())
                .status(r.getStatus())
                .reason(r.getReason())
                .idempotencyKey(r.getIdempotencyKey())
                .failureReason(r.getFailureReason())
                .retryCount(r.getRetryCount())
                .processedAt(r.getProcessedAt())
                .createdAt(r.getCreatedAt())
                .build();
    }
}
