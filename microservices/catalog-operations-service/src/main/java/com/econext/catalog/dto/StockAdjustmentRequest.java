package com.econext.catalog.dto;

import com.econext.catalog.entity.StockAdjustmentType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockAdjustmentRequest {
    @NotNull(message = "Product ID is required")
    private Long productId;

    @NotNull(message = "Adjustment type is required")
    private StockAdjustmentType adjustmentType;

    @NotNull(message = "Quantity changed is required")
    private Integer quantity;

    @NotBlank(message = "Reason for adjustment is required")
    private String reason;
}
