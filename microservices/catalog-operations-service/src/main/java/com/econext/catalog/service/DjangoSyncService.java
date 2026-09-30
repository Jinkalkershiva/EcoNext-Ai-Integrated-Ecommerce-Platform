package com.econext.catalog.service;

import com.econext.catalog.entity.OperationalCategory;
import com.econext.catalog.entity.OperationalProduct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
public class DjangoSyncService {

    private final RestTemplate restTemplate;
    private final String djangoBackendUrl;
    private final boolean syncEnabled;
    private final String internalServiceKey;

    public DjangoSyncService(
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

    public Long syncCategoryToDjango(OperationalCategory category) {
        if (!syncEnabled) return null;
        try {
            String url = djangoBackendUrl + "/api/admin/categories/";
            Map<String, Object> body = new HashMap<>();
            body.put("name", category.getName());
            body.put("description", category.getDescription());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-Internal-Service-Key", internalServiceKey);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map data = response.getBody();
                if (data.containsKey("category") && data.get("category") instanceof Map catMap) {
                    Object id = catMap.get("id");
                    if (id instanceof Number n) return n.longValue();
                }
            }
        } catch (Exception e) {
            log.warn("Django category sync note: {} (will operate in standalone mode)", e.getMessage());
        }
        return null;
    }

    public Long syncProductToDjango(OperationalProduct product) {
        if (!syncEnabled) return null;
        try {
            String url = djangoBackendUrl + "/api/admin/products/";
            Map<String, Object> body = new HashMap<>();
            body.put("name", product.getName());
            body.put("description", product.getDescription());
            body.put("category", product.getCategory().getDjangoCategoryId() != null ? product.getCategory().getDjangoCategoryId() : product.getCategory().getId());
            body.put("current_price", product.getCurrentPrice());
            body.put("stock", product.getStock());
            body.put("image_url", product.getImageUrl());
            body.put("sustainability_score", product.getSustainabilityScore());
            body.put("popularity_score", product.getPopularityScore());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-Internal-Service-Key", internalServiceKey);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map data = response.getBody();
                if (data.containsKey("product") && data.get("product") instanceof Map prodMap) {
                    Object id = prodMap.get("id");
                    if (id instanceof Number n) return n.longValue();
                }
            }
        } catch (Exception e) {
            log.warn("Django product sync note: {} (will operate in standalone mode)", e.getMessage());
        }
        return null;
    }

    public void syncStockUpdateToDjango(Long djangoProductId, int newStock) {
        if (!syncEnabled || djangoProductId == null) return;
        try {
            String url = djangoBackendUrl + "/api/admin/products/" + djangoProductId + "/";
            Map<String, Object> body = new HashMap<>();
            body.put("stock", newStock);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-Internal-Service-Key", internalServiceKey);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

            restTemplate.exchange(url, HttpMethod.PATCH, entity, Map.class);
        } catch (Exception e) {
            log.warn("Django stock sync note: {}", e.getMessage());
        }
    }

    public void syncProductUpdateToDjango(OperationalProduct product) {
        if (!syncEnabled || product.getDjangoProductId() == null) return;
        try {
            String url = djangoBackendUrl + "/api/admin/products/" + product.getDjangoProductId() + "/";
            Map<String, Object> body = new HashMap<>();
            body.put("name", product.getName());
            body.put("description", product.getDescription());
            body.put("current_price", product.getCurrentPrice());
            body.put("stock", product.getStock());
            body.put("image_url", product.getImageUrl());
            body.put("sustainability_score", product.getSustainabilityScore());
            body.put("popularity_score", product.getPopularityScore());
            if (product.getCategory() != null) {
                body.put("category", product.getCategory().getDjangoCategoryId() != null ? product.getCategory().getDjangoCategoryId() : product.getCategory().getId());
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-Internal-Service-Key", internalServiceKey);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

            restTemplate.exchange(url, HttpMethod.PATCH, entity, Map.class);
        } catch (Exception e) {
            log.warn("Django product update sync note: {}", e.getMessage());
        }
    }
}
