package com.econext.order.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchAssignOrdersRequest {

    @NotEmpty(message = "At least one order ID is required")
    private List<Long> orderIds;

    private Boolean routeException;

    private String exceptionReason;
}
