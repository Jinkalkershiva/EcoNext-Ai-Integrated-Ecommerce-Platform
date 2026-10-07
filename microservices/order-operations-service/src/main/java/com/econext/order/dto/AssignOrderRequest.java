package com.econext.order.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignOrderRequest {

    @NotNull(message = "Order ID is required")
    private Long orderId;

    @Builder.Default
    private Boolean routeException = false;

    private String exceptionReason;
}
