package com.econext.payment.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreatePaymentRequest {

    @JsonProperty("order_id")
    private Long orderId;

    @JsonProperty("checkout_reference")
    private String checkoutReference;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "1.00", message = "Amount must be at least ₹1.00")
    private BigDecimal amount;

    private String currency; // Default INR

    @JsonProperty("payment_method")
    private String paymentMethod; // RAZORPAY, COD

    @JsonProperty("customer_name")
    private String customerName;

    @JsonProperty("customer_email")
    private String customerEmail;

    @JsonProperty("customer_phone")
    private String customerPhone;
}
