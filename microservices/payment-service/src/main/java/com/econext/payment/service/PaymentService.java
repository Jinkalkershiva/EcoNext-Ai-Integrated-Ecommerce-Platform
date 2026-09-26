package com.econext.payment.service;

import com.econext.payment.dto.CreatePaymentRequest;
import com.econext.payment.dto.PaymentResponse;
import com.econext.payment.dto.VerifyPaymentRequest;

import java.util.List;

public interface PaymentService {

    PaymentResponse createPaymentOrder(CreatePaymentRequest request, Long userId);

    PaymentResponse verifyPayment(VerifyPaymentRequest request, Long userId);

    PaymentResponse getPaymentByOrderId(Long orderId, Long userId);

    List<PaymentResponse> getUserPayments(Long userId);

    List<PaymentResponse> getAllPaymentsAdmin();
}
