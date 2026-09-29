package com.econext.order.service;

import com.econext.order.entity.OperationalOrder;
import com.econext.order.entity.OperationalOrderItem;
import com.econext.order.entity.OrderStatus;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
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

    @SuppressWarnings("unchecked")
    public OperationalOrder fetchOrderFromDjango(Long djangoOrderId) {
        if (!syncEnabled || djangoOrderId == null) return null;
        try {
            String url = djangoBackendUrl + "/api/admin/orders/" + djangoOrderId + "/";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-Internal-Service-Key", internalServiceKey);
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                return null;
            }

            Map<String, Object> body = response.getBody();
            Map<String, Object> orderMap = (Map<String, Object>) body.get("order");
            if (orderMap == null) {
                orderMap = (Map<String, Object>) body.get("data");
            }
            if (orderMap == null) return null;

            Long id = orderMap.get("id") != null ? ((Number) orderMap.get("id")).longValue() : djangoOrderId;
            Long userId = orderMap.get("user") != null ? ((Number) orderMap.get("user")).longValue() : (orderMap.get("user_id") != null ? ((Number) orderMap.get("user_id")).longValue() : 1L);
            String username = (String) orderMap.getOrDefault("recipient_name", orderMap.getOrDefault("customer_name", "CUSTOMER_" + userId));
            String email = (String) orderMap.getOrDefault("email", orderMap.getOrDefault("customer_email", "customer@econext.org"));
            String customerName = (String) orderMap.getOrDefault("customer_name", orderMap.getOrDefault("recipient_name", username));

            BigDecimal totalPrice = BigDecimal.ZERO;
            if (orderMap.get("total_price") != null) {
                totalPrice = new BigDecimal(orderMap.get("total_price").toString());
            }

            String shippingAddress = (String) orderMap.get("shipping_address");
            String city = (String) orderMap.get("city");
            String state = (String) orderMap.get("state");
            String zipcode = (String) orderMap.get("zipcode");
            String country = (String) orderMap.getOrDefault("country", "India");
            String carrierName = (String) orderMap.getOrDefault("carrier_name", "EcoExpress Carbon-Neutral");
            String trackingNumber = (String) orderMap.get("tracking_number");

            String statusStr = (String) orderMap.getOrDefault("status", "ORDER_CONFIRMED");
            OrderStatus orderStatus = OrderStatus.ORDER_CONFIRMED;
            try {
                orderStatus = OrderStatus.valueOf(statusStr.toUpperCase());
            } catch (Exception ignored) {}

            OperationalOrder order = OperationalOrder.builder()
                    .customerId(userId)
                    .customerUsername(username)
                    .customerEmail(email)
                    .customerName(customerName)
                    .totalAmount(totalPrice)
                    .shippingAddress(shippingAddress)
                    .city(city)
                    .state(state)
                    .zipcode(zipcode)
                    .country(country)
                    .currentStatus(orderStatus)
                    .carrierName(carrierName)
                    .trackingNumber(trackingNumber)
                    .djangoOrderId(id)
                    .items(new ArrayList<>())
                    .build();

            List<Map<String, Object>> itemsList = (List<Map<String, Object>>) orderMap.get("items");
            if (itemsList != null) {
                for (Map<String, Object> itemMap : itemsList) {
                    Long itemId = itemMap.get("id") != null ? ((Number) itemMap.get("id")).longValue() : null;
                    int qty = itemMap.get("quantity") != null ? ((Number) itemMap.get("quantity")).intValue() : 1;
                    BigDecimal priceAtPurchase = BigDecimal.ZERO;
                    if (itemMap.get("price_at_purchase") != null) {
                        priceAtPurchase = new BigDecimal(itemMap.get("price_at_purchase").toString());
                    }
                    BigDecimal subtotal = priceAtPurchase.multiply(BigDecimal.valueOf(qty));

                    Long prodId = 1L;
                    String prodName = "Eco Product";
                    Object prodObj = itemMap.get("product");
                    if (prodObj instanceof Map) {
                        Map<String, Object> pMap = (Map<String, Object>) prodObj;
                        if (pMap.get("id") != null) prodId = ((Number) pMap.get("id")).longValue();
                        if (pMap.get("name") != null) prodName = (String) pMap.get("name");
                    } else if (itemMap.get("product_id") != null) {
                        prodId = ((Number) itemMap.get("product_id")).longValue();
                        if (itemMap.get("product_name") != null) prodName = (String) itemMap.get("product_name");
                    }

                    OperationalOrderItem item = OperationalOrderItem.builder()
                            .order(order)
                            .productId(prodId)
                            .productName(prodName)
                            .quantity(qty)
                            .priceAtPurchase(priceAtPurchase)
                            .subtotal(subtotal)
                            .build();
                    order.getItems().add(item);
                }
            }

            return order;
        } catch (Exception e) {
            log.warn("Django fetch order #{} note: {}", djangoOrderId, e.getMessage());
            return null;
        }
    }
}
