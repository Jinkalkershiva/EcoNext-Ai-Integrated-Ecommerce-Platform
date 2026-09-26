package com.econext.payment.service;

import com.econext.payment.dto.CreatePaymentRequest;
import com.econext.payment.dto.PaymentEvent;
import com.econext.payment.dto.PaymentResponse;
import com.econext.payment.dto.VerifyPaymentRequest;
import com.econext.payment.entity.PaymentTransaction;
import com.econext.payment.exception.BadRequestException;
import com.econext.payment.exception.ResourceNotFoundException;
import com.econext.payment.kafka.PaymentEventProducer;
import com.econext.payment.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentServiceImpl implements PaymentService {

    private final PaymentRepository paymentRepository;
    private final RazorpayService razorpayService;
    private final PaymentEventProducer paymentEventProducer;

    @Override
    @Transactional
    public PaymentResponse createPaymentOrder(CreatePaymentRequest request, Long userId) {
        log.info("Initiating payment for orderId {} by userId {}, amount: {}", request.getOrderId(), userId, request.getAmount());

        // Check if transaction already exists for this order
        PaymentTransaction transaction = paymentRepository.findByOrderId(request.getOrderId())
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
                request.getOrderId(),
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
        log.info("Verifying Razorpay payment for orderId: {}, paymentId: {}", request.getOrderId(), request.getRazorpayPaymentId());

        PaymentTransaction transaction = paymentRepository.findByOrderId(request.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("No payment transaction found for order ID: " + request.getOrderId()));

        if (!transaction.getUserId().equals(userId)) {
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
}
