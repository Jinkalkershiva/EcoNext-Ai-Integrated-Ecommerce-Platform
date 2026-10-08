package com.econext.order.service;

import com.econext.order.entity.OperationalOrder;
import com.econext.order.entity.OperationalOrderItem;
import com.econext.order.entity.OrderStatus;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
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
    private final ObjectMapper objectMapper = new ObjectMapper();

    public DjangoOrderSyncService(
            RestTemplateBuilder builder,
            @Value("${app.django.backend-url:http://localhost:8000}") String djangoBackendUrl,
            @Value("${app.django.enabled:true}") boolean syncEnabled,
            @Value("${app.internal-service-key:econext-internal-microservice-key-2026}") String internalServiceKey
    ) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setBufferRequestBody(true);
        requestFactory.setConnectTimeout(Duration.ofSeconds(4));
        requestFactory.setReadTimeout(Duration.ofSeconds(6));
        this.restTemplate = new RestTemplate(requestFactory);
        this.djangoBackendUrl = djangoBackendUrl;
        this.syncEnabled = syncEnabled;
        this.internalServiceKey = internalServiceKey;
    }

    public void syncOrderStatusToDjango(Long djangoOrderId, OrderStatus status) {
        syncOrderStatusToDjango(djangoOrderId, status, null, null, null, null);
    }

    public void syncOrderStatusToDjango(Long djangoOrderId, OrderStatus status, String shipmentNumber, String trackingNumber, String carrierName, String paymentStatus) {
        if (!syncEnabled || djangoOrderId == null) return;
        try {
            String djangoStatus = status != null ? status.toDjangoStatus() : null;
            String url = djangoBackendUrl + "/api/admin/orders/" + djangoOrderId + "/status/";

            Map<String, Object> body = new HashMap<>();
            if (djangoStatus != null) {
                body.put("status", djangoStatus);
            }
            if (shipmentNumber != null) {
                body.put("shipmentNumber", shipmentNumber);
            }
            if (trackingNumber != null) {
                body.put("trackingNumber", trackingNumber);
            }
            if (carrierName != null) {
                body.put("carrierName", carrierName);
            }
            if (paymentStatus != null) {
                body.put("paymentStatus", paymentStatus);
            }

            byte[] jsonBytes = objectMapper.writeValueAsBytes(body);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setContentLength(jsonBytes.length);
            headers.set("X-Internal-Service-Key", internalServiceKey);
            HttpEntity<byte[]> entity = new HttpEntity<>(jsonBytes, headers);

            restTemplate.exchange(url, HttpMethod.POST, entity, Map.class);
            log.info("Synced order #{} status -> {} (shipment: {}, tracking: {}) with Django backend", djangoOrderId, djangoStatus, shipmentNumber, trackingNumber);
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

            String orderNumber = (String) orderMap.get("order_number");
            if (orderNumber == null || orderNumber.isBlank()) {
                orderNumber = (String) orderMap.get("order_reference_number");
            }

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
                    .orderNumber(orderNumber)
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
            log.warn("Failed to fetch order #{} from Django backend: {}", djangoOrderId, e.getMessage());
            return null;
        }
    }
}
