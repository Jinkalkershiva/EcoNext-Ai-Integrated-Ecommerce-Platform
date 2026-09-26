package com.econext.importanalysis.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SearchTrendsResponse {
    private List<SearchKeywordMetric> topQueries;
    private List<SearchKeywordMetric> zeroResultQueries;
    private List<SearchCategoryDistribution> categoryBreakdown;
    private Double averageResultCount;
    private Double searchToCartConversionRate;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SearchKeywordMetric {
        private String query;
        private Long count;
        private Double avgResults;
        private Double conversionRate;
        private String trend; // UP, DOWN, STABLE
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SearchCategoryDistribution {
        private String category;
        private Long searchVolume;
        private Double percentage;
    }
}
