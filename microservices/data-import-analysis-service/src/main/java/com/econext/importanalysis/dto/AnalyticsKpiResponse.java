package com.econext.importanalysis.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalyticsKpiResponse {
    private long totalProducts;
    private long totalCategories;
    private long inStockCount;
    private long lowStockCount;
    private long outOfStockCount;
    private long totalOrders;
    private long pendingOrders;
    private long confirmedOrders;
    private long shippedOrders;
    private long deliveredOrders;
    private long cancelledOrders;
    private BigDecimal totalRevenue;
    private BigDecimal deliveredRevenue;
    private long totalStaffCount;
    private long activeStaffCount;
    private long totalImportsCompleted;
    private Map<String, Long> categoryDistribution;
    private Map<String, Long> orderStatusDistribution;
    private List<Map<String, Object>> recentStaffActivity;
}
