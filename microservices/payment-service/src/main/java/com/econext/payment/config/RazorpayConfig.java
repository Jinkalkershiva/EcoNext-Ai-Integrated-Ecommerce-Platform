package com.econext.payment.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "app.razorpay")
@Data
public class RazorpayConfig {

    private String keyId = "rzp_test_1DP5mmOlF5G5ag";
    private String keySecret = "s6mK5wU4e2r7g9X1y3z8a4b2";
    private String webhookSecret = "econext_rzp_webhook_secret_2026";
    private String companyName = "EcoNext Sustainable Retail";
    private String currency = "INR";
}
