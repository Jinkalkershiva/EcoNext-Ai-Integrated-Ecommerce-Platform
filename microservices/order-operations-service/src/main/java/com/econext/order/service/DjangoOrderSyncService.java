package com.econext.order.service;

import com.econext.order.entity.OrderStatus;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
public class DjangoOrderSyncService {

    private final RestTemplate restTemplate;
    private final String djangoBackendUrl;
    private final boolean syncEnabled;
    private final String internalServiceKey;

    public DjangoOrderSyncService(
            RestTemplateBuilder builder,
            @Value("${app.django.backend-url:http://localhost:8000}") String djangoBackendUrl,
            @Value("${app.django.enabled:true}") boolean syncEnabled,
            @Value("${app.internal-service-key:econext-internal-microservice-key-2026}") String internalServiceKey
    ) {
        this.restTemplate = builder
                .setConnectTimeout(Duration.ofSeconds(3))
                .setReadTimeout(Duration.ofSeconds(5))
                .build();
        this.djangoBackendUrl = djangoBackendUrl;
        this.syncEnabled = syncEnabled;
        this.internalServiceKey = internalServiceKey;
    }

    public void syncOrderStatusToDjango(Long djangoOrderId, OrderStatus status) {
        if (!syncEnabled || djangoOrderId == null) return;
        try {
            String djangoStatus = status.toDjangoStatus();
            String url = djangoBackendUrl + "/api/admin/orders/" + djangoOrderId + "/status/";

            Map<String, Object> body = new HashMap<>();
            body.put("status", djangoStatus);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-Internal-Service-Key", internalServiceKey);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

            restTemplate.exchange(url, HttpMethod.PATCH, entity, Map.class);
            log.info("Synced order #{} status -> {} ({}) with Django backend", djangoOrderId, status, djangoStatus);
        } catch (Exception e) {
            log.warn("Django order status sync note: {}", e.getMessage());
        }
    }
}
