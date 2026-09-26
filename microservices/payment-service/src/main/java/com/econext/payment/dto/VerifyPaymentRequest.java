package com.econext.payment.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VerifyPaymentRequest {

    @NotNull(message = "Order ID is required")
    @JsonProperty("order_id")
    private Long orderId;

    @NotBlank(message = "Razorpay Order ID is required")
    @JsonProperty("razorpay_order_id")
    private String razorpayOrderId;

    @NotBlank(message = "Razorpay Payment ID is required")
    @JsonProperty("razorpay_payment_id")
    private String razorpayPaymentId;

    @NotBlank(message = "Razorpay Signature is required")
    @JsonProperty("razorpay_signature")
    private String razorpaySignature;
}
