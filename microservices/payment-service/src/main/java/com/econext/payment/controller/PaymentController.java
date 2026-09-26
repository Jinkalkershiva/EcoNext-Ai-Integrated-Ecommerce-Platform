package com.econext.payment.controller;

import com.econext.payment.dto.ApiResponse;
import com.econext.payment.dto.CreatePaymentRequest;
import com.econext.payment.dto.PaymentResponse;
import com.econext.payment.dto.VerifyPaymentRequest;
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

    @PostMapping("/create-order")
    public ResponseEntity<ApiResponse<PaymentResponse>> createOrder(
            @Valid @RequestBody CreatePaymentRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        log.info("Creating payment order for user: {}, orderId: {}", principal.getUsername(), request.getOrderId());
        PaymentResponse response = paymentService.createPaymentOrder(request, principal.getId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Payment order initialized", response));
    }

    @PostMapping("/verify")
    public ResponseEntity<ApiResponse<PaymentResponse>> verifyPayment(
            @Valid @RequestBody VerifyPaymentRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        log.info("Verifying payment for user: {}, orderId: {}", principal.getUsername(), request.getOrderId());
        PaymentResponse response = paymentService.verifyPayment(request, principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Payment verified successfully", response));
    }

    @GetMapping("/order/{orderId}")
    public ResponseEntity<ApiResponse<PaymentResponse>> getPaymentByOrderId(
            @PathVariable("orderId") Long orderId,
            @AuthenticationPrincipal UserPrincipal principal) {
        PaymentResponse response = paymentService.getPaymentByOrderId(orderId, principal.getId());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/my-payments")
    public ResponseEntity<ApiResponse<List<PaymentResponse>>> getMyPayments(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<PaymentResponse> list = paymentService.getUserPayments(principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Payments retrieved", list));
    }

    @GetMapping("/all")
    public ResponseEntity<ApiResponse<List<PaymentResponse>>> getAllPaymentsAdmin(
            @AuthenticationPrincipal UserPrincipal principal) {
        log.info("Admin {} fetching all system transactions", principal.getUsername());
        List<PaymentResponse> list = paymentService.getAllPaymentsAdmin();
        return ResponseEntity.ok(ApiResponse.success("All transactions retrieved", list));
    }
}
