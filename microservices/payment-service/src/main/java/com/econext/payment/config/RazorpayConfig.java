package com.econext.payment.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "app.razorpay")
@Data
public class RazorpayConfig {

    private String keyId = "rzp_test_placeholder";
    private String keySecret = "placeholder_secret";
    private String companyName = "EcoNext Sustainable Retail";
    private String currency = "INR";
}
