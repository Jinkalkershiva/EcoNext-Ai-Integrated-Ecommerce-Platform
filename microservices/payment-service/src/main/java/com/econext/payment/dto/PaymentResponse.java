package com.econext.payment.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentResponse {

    private Long id;

    @JsonProperty("order_id")
    private Long orderId;

    @JsonProperty("user_id")
    private Long userId;

    @JsonProperty("razorpay_order_id")
    private String razorpayOrderId;

    @JsonProperty("razorpay_payment_id")
    private String razorpayPaymentId;

    @JsonProperty("razorpay_key_id")
    private String razorpayKeyId;

    private BigDecimal amount;
    private String currency;
    private String status;

    @JsonProperty("payment_method")
    private String paymentMethod;

    @JsonProperty("error_message")
    private String errorMessage;

    @JsonProperty("created_at")
    private LocalDateTime createdAt;
}
