package com.econext.payment.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "razorpay")
@Data
public class RazorpayConfig {

    private String keyId;
    private String keySecret;
    private String webhookSecret;
    private String companyName = "EcoNext Sustainable Retail";
    private String currency = "INR";
}

