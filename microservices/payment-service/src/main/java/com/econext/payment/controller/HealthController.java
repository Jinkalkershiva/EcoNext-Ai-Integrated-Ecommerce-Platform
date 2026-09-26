package com.econext.payment.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
public class HealthController {

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> map = new HashMap<>();
        map.put("service", "payment-service");
        map.put("status", "UP");
        map.put("gateway", "Razorpay");
        map.put("timestamp", LocalDateTime.now());
        return ResponseEntity.ok(map);
    }
}
