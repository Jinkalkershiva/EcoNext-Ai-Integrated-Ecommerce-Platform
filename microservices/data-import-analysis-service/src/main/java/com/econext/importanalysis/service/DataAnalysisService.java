package com.econext.importanalysis.service;

import com.econext.importanalysis.dto.AnalyticsKpiResponse;
import com.econext.importanalysis.repository.ImportJobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class DataAnalysisService {

    private final ImportJobRepository importJobRepository;

    @Value("${app.catalog-service-url:http://localhost:8082}")
    private String catalogServiceUrl;

    @Value("${app.order-service-url:http://localhost:8084}")
    private String orderServiceUrl;

    @Value("${app.admin-service-url:http://localhost:8085}")
    private String adminServiceUrl;

    private final RestTemplate restTemplate = new RestTemplateBuilder()
            .setConnectTimeout(Duration.ofSeconds(2))
            .setReadTimeout(Duration.ofSeconds(4))
            .build();

    public AnalyticsKpiResponse getAggregatedKpis(String jwtToken) {
        long totalProducts = 0;
        long totalCategories = 0;
        long inStock = 0;
        long lowStock = 0;
        long outOfStock = 0;
        Map<String, Long> categoryDistribution = new HashMap<>();

        long totalOrders = 0;
        long pendingOrders = 0;
        long confirmedOrders = 0;
        long shippedOrders = 0;
        long deliveredOrders = 0;
        long cancelledOrders = 0;
        BigDecimal totalRevenue = BigDecimal.ZERO;
        BigDecimal deliveredRevenue = BigDecimal.ZERO;
        Map<String, Long> orderStatusDistribution = new HashMap<>();

        long totalStaff = 0;
        long activeStaff = 0;
        List<Map<String, Object>> staffActivity = new ArrayList<>();

        // 1. Fetch from catalog-service
        try {
            ResponseEntity<Map> resp = restTemplate.getForEntity(catalogServiceUrl + "/api/inventory-ops/summary", Map.class);
            if (resp.getStatusCode().is2xxSuccessful() && resp.getBody() != null) {
                Map data = (Map) resp.getBody().get("data");
                if (data != null) {
                    totalProducts = getLong(data.get("totalProducts"));
                    inStock = getLong(data.get("inStockCount"));
                    lowStock = getLong(data.get("lowStockCount"));
                    outOfStock = getLong(data.get("outOfStockCount"));
                    if (data.get("categoryStockCounts") instanceof Map m) {
                        m.forEach((k, v) -> categoryDistribution.put(String.valueOf(k), getLong(v)));
                    }
                }
            }
        } catch (Exception e) {
            log.debug("Catalog service KPI note: {}", e.getMessage());
        }

        // 2. Fetch from order-service
        try {
            ResponseEntity<Map> resp = restTemplate.getForEntity(orderServiceUrl + "/api/order-ops/summary", Map.class);
            if (resp.getStatusCode().is2xxSuccessful() && resp.getBody() != null) {
                Map data = (Map) resp.getBody().get("data");
                if (data != null) {
                    totalOrders = getLong(data.get("totalOrders"));
                    pendingOrders = getLong(data.get("pendingOrders"));
                    confirmedOrders = getLong(data.get("confirmedOrders"));
                    shippedOrders = getLong(data.get("shippedOrders"));
                    deliveredOrders = getLong(data.get("deliveredOrders"));
                    cancelledOrders = getLong(data.get("cancelledOrders"));
                    totalRevenue = getBigDecimal(data.get("totalRevenue"));
                    deliveredRevenue = getBigDecimal(data.get("deliveredRevenue"));
                    if (data.get("statusCounts") instanceof Map m) {
                        m.forEach((k, v) -> orderStatusDistribution.put(String.valueOf(k), getLong(v)));
                    }
                }
            }
        } catch (Exception e) {
            log.debug("Order service KPI note: {}", e.getMessage());
        }

        // 3. Fetch from admin-staff-service
        try {
            ResponseEntity<Map> resp = restTemplate.getForEntity(adminServiceUrl + "/api/admin/staff/activity-metrics", Map.class);
            if (resp.getStatusCode().is2xxSuccessful() && resp.getBody() != null) {
                Object dataObj = resp.getBody().get("data");
                if (dataObj instanceof List list) {
                    totalStaff = list.size();
                    activeStaff = list.stream().filter(o -> o instanceof Map m && m.get("totalActions") != null && getLong(m.get("totalActions")) > 0).count();
                    staffActivity = (List<Map<String, Object>>) list;
                }
            }
        } catch (Exception e) {
            log.debug("Staff service KPI note: {}", e.getMessage());
        }

        long completedImports = importJobRepository.count();

        return AnalyticsKpiResponse.builder()
                .totalProducts(totalProducts)
                .totalCategories(categoryDistribution.size())
                .inStockCount(inStock)
                .lowStockCount(lowStock)
                .outOfStockCount(outOfStock)
                .totalOrders(totalOrders)
                .pendingOrders(pendingOrders)
                .confirmedOrders(confirmedOrders)
                .shippedOrders(shippedOrders)
                .deliveredOrders(deliveredOrders)
                .cancelledOrders(cancelledOrders)
                .totalRevenue(totalRevenue)
                .deliveredRevenue(deliveredRevenue)
                .totalStaffCount(totalStaff)
                .activeStaffCount(activeStaff)
                .totalImportsCompleted(completedImports)
                .categoryDistribution(categoryDistribution)
                .orderStatusDistribution(orderStatusDistribution)
                .recentStaffActivity(staffActivity)
                .build();
    }

    public String exportAnalyticsAsCsv(AnalyticsKpiResponse kpis) {
        StringBuilder sb = new StringBuilder();
        sb.append("Metric,Value\n");
        sb.append("Total Products,").append(kpis.getTotalProducts()).append("\n");
        sb.append("In Stock Products,").append(kpis.getInStockCount()).append("\n");
        sb.append("Low Stock Products,").append(kpis.getLowStockCount()).append("\n");
        sb.append("Out of Stock Products,").append(kpis.getOutOfStockCount()).append("\n");
        sb.append("Total Orders,").append(kpis.getTotalOrders()).append("\n");
        sb.append("Pending Orders,").append(kpis.getPendingOrders()).append("\n");
        sb.append("Confirmed Orders,").append(kpis.getConfirmedOrders()).append("\n");
        sb.append("Shipped Orders,").append(kpis.getShippedOrders()).append("\n");
        sb.append("Delivered Orders,").append(kpis.getDeliveredOrders()).append("\n");
        sb.append("Cancelled Orders,").append(kpis.getCancelledOrders()).append("\n");
        sb.append("Total Sales Revenue (INR),").append(kpis.getTotalRevenue()).append("\n");
        sb.append("Delivered Revenue (INR),").append(kpis.getDeliveredRevenue()).append("\n");
        sb.append("Total Staff Members,").append(kpis.getTotalStaffCount()).append("\n");
        sb.append("Active Staff Members,").append(kpis.getActiveStaffCount()).append("\n");
        sb.append("Bulk Data Imports Completed,").append(kpis.getTotalImportsCompleted()).append("\n");
        return sb.toString();
    }

    private long getLong(Object val) {
        if (val instanceof Number n) return n.longValue();
        if (val != null) {
            try { return Long.parseLong(val.toString()); } catch (Exception ignored) {}
        }
        return 0L;
    }

    private BigDecimal getBigDecimal(Object val) {
        if (val instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        if (val != null) {
            try { return new BigDecimal(val.toString()); } catch (Exception ignored) {}
        }
        return BigDecimal.ZERO;
    }
}
