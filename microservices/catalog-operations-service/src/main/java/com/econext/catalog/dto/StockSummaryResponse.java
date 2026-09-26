package com.econext.catalog.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockSummaryResponse {
    private long totalProducts;
    private long inStockCount;
    private long lowStockCount;
    private long outOfStockCount;
    private Map<String, Long> categoryStockCounts;
}
