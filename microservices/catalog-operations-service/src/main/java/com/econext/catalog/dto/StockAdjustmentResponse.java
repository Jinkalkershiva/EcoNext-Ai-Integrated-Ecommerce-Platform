package com.econext.catalog.dto;

import com.econext.catalog.entity.StockAdjustmentType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockAdjustmentResponse {
    private Long id;
    private Long productId;
    private String productName;
    private StockAdjustmentType adjustmentType;
    private Integer quantityChanged;
    private Integer previousStock;
    private Integer newStock;
    private String reason;
    private Long staffId;
    private String staffUsername;
    private LocalDateTime timestamp;
}
