package com.econext.order.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeliveryOtpVerifyRequest {
    @NotBlank(message = "Delivery verification PIN / OTP is required")
    private String otp;

    private Long deliveryStaffId;
    private String deliveryStaffUsername;
    private String recipientNote;
}
