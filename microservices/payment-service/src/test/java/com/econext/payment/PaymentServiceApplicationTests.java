package com.econext.payment;

import com.econext.payment.dto.CreatePaymentRequest;
import com.econext.payment.dto.PaymentResponse;
import com.econext.payment.dto.VerifyPaymentRequest;
import com.econext.payment.service.PaymentService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
class PaymentServiceApplicationTests {

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private com.econext.payment.config.RazorpayConfig razorpayConfig;

    @Test
    @DisplayName("Context loads successfully")
    void contextLoads() {
        assertNotNull(paymentService);
        assertNotNull(razorpayConfig);
    }

    @Test
    @DisplayName("Should create payment order and verify transaction lifecycle")
    void shouldCreateAndVerifyPayment() throws Exception {

        Long orderId = 8801L;
        Long userId = 777L;
        BigDecimal amount = new BigDecimal("1299.00");

        // 1. Create order
        CreatePaymentRequest createReq = CreatePaymentRequest.builder()
                .orderId(orderId)
                .amount(amount)
                .currency("INR")
                .paymentMethod("RAZORPAY_UPI")
                .build();

        PaymentResponse created = paymentService.createPaymentOrder(createReq, userId);
        assertNotNull(created);
        assertEquals(orderId, created.getOrderId());
        assertEquals("PENDING", created.getStatus());
        assertNotNull(created.getRazorpayOrderId());

        // 2. Query order payment
        PaymentResponse queried = paymentService.getPaymentByOrderId(orderId, userId);
        assertEquals(created.getRazorpayOrderId(), queried.getRazorpayOrderId());

        // 3. Verify payment signature with real HMAC-SHA256
        String paymentId = "pay_test_987654321";
        String data = created.getRazorpayOrderId() + "|" + paymentId;
        String secret = razorpayConfig.getKeySecret();

        
        javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
        mac.init(new javax.crypto.spec.SecretKeySpec(secret.getBytes(java.nio.charset.StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] hash = mac.doFinal(data.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        StringBuilder hexString = new StringBuilder();
        for (byte b : hash) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) hexString.append('0');
            hexString.append(hex);
        }
        String validSignature = hexString.toString();

        VerifyPaymentRequest verifyReq = VerifyPaymentRequest.builder()
                .orderId(orderId)
                .razorpayOrderId(created.getRazorpayOrderId())
                .razorpayPaymentId(paymentId)
                .razorpaySignature(validSignature)
                .build();


        PaymentResponse verified = paymentService.verifyPayment(verifyReq, userId);
        assertNotNull(verified);
        assertEquals("SUCCESS", verified.getStatus());
        assertEquals("pay_test_987654321", verified.getRazorpayPaymentId());

        // 4. List user payments
        List<PaymentResponse> userPayments = paymentService.getUserPayments(userId);
        assertFalse(userPayments.isEmpty());
        assertEquals(orderId, userPayments.get(0).getOrderId());
    }
}
