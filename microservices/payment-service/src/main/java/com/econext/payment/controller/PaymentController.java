package com.econext.payment.controller;

import com.econext.payment.dto.*;
import com.econext.payment.security.UserPrincipal;
import com.econext.payment.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

    private final PaymentService paymentService;

    // Called by API Gateway (/api/payments/create-order) during customer checkout.
    // Initializes Razorpay Order ID and records a pending payment transaction.
    @PostMapping({"/create-order", "/create-order/"})
    public ResponseEntity<ApiResponse<PaymentResponse>> createOrder(
            @Valid @RequestBody CreatePaymentRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        Long userId = principal != null ? principal.getId() : 1L;
        String username = principal != null ? principal.getUsername() : "CUSTOMER";
        log.info("Creating payment order for user: {}, orderId: {}", username, request.getOrderId());
        PaymentResponse response = paymentService.createPaymentOrder(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Payment order initialized", response));
    }

    // Called by API Gateway (/api/payments/verify) after Razorpay checkout completion.
    // Performs server-side HMAC-SHA256 cryptographic verification and emits PAYMENT_SUCCESS to Kafka topic 'payment-events'.
    @PostMapping({"/verify", "/verify/"})
    public ResponseEntity<ApiResponse<PaymentResponse>> verifyPayment(
            @Valid @RequestBody VerifyPaymentRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        Long userId = principal != null ? principal.getId() : 1L;
        String username = principal != null ? principal.getUsername() : "CUSTOMER";
        log.info("Verifying payment for user: {}, orderId: {}", username, request.getOrderId());
        PaymentResponse response = paymentService.verifyPayment(request, userId);
        return ResponseEntity.ok(ApiResponse.success("Payment verified successfully", response));
    }

    @GetMapping({"/order/{orderId}", "/order/{orderId}/"})
    public ResponseEntity<ApiResponse<PaymentResponse>> getPaymentByOrderId(
            @PathVariable("orderId") Long orderId,
            @AuthenticationPrincipal UserPrincipal principal) {
        Long userId = principal != null ? principal.getId() : 1L;
        PaymentResponse response = paymentService.getPaymentByOrderId(orderId, userId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping({"/my-payments", "/my-payments/"})
    public ResponseEntity<ApiResponse<List<PaymentResponse>>> getMyPayments(
            @AuthenticationPrincipal UserPrincipal principal) {
        Long userId = principal != null ? principal.getId() : 1L;
        List<PaymentResponse> list = paymentService.getUserPayments(userId);
        return ResponseEntity.ok(ApiResponse.success("Payments retrieved", list));
    }

    @GetMapping({"/all", "/all/"})
    public ResponseEntity<ApiResponse<List<PaymentResponse>>> getAllPaymentsAdmin(
            @AuthenticationPrincipal UserPrincipal principal) {
        String username = principal != null ? principal.getUsername() : "ADMIN";
        log.info("Admin {} fetching all system transactions", username);
        List<PaymentResponse> list = paymentService.getAllPaymentsAdmin();
        return ResponseEntity.ok(ApiResponse.success("All transactions retrieved", list));
    }

    // ============================================================
    // Refund Management Endpoints
    // ============================================================

    @PostMapping({"/refunds", "/refunds/"})
    public ResponseEntity<ApiResponse<RefundResponse>> initiateRefund(
            @Valid @RequestBody CreateRefundRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        Long userId = principal != null ? principal.getId() : 1L;
        log.info("Initiating refund for order #{} by user/staff #{}", request.getOrderId(), userId);
        RefundResponse response = paymentService.initiateRefund(request, userId);
        return ResponseEntity.ok(ApiResponse.success("Refund processed with status: " + response.getStatus(), response));
    }

    @PostMapping({"/refunds/{id}/retry", "/refunds/{id}/retry/"})
    public ResponseEntity<ApiResponse<RefundResponse>> retryRefund(
            @PathVariable("id") Long refundId,
            @AuthenticationPrincipal UserPrincipal principal) {
        Long userId = principal != null ? principal.getId() : 1L;
        log.info("Retrying refund #{} by admin #{}", refundId, userId);
        RefundResponse response = paymentService.retryRefund(refundId, userId);
        return ResponseEntity.ok(ApiResponse.success("Refund retry executed with status: " + response.getStatus(), response));
    }

    @GetMapping({"/refunds/order/{orderId}", "/refunds/order/{orderId}/"})
    public ResponseEntity<ApiResponse<List<RefundResponse>>> getRefundsByOrderId(
            @PathVariable("orderId") Long orderId) {
        List<RefundResponse> refunds = paymentService.getRefundsByOrderId(orderId);
        return ResponseEntity.ok(ApiResponse.success("Refunds retrieved", refunds));
    }

    @GetMapping({"/refunds", "/refunds/"})
    public ResponseEntity<ApiResponse<List<RefundResponse>>> getAllRefundsAdmin(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<RefundResponse> refunds = paymentService.getAllRefundsAdmin();
        return ResponseEntity.ok(ApiResponse.success("All refund records retrieved", refunds));
    }
}
