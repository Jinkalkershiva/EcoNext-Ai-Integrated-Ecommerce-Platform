package com.econext.admin.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffActivityMetricResponse {
    private Long staffId;
    private String username;
    private String name;
    private String roleName;
    private long totalActions;
    private long catalogOperations;
    private long inventoryAdjustments;
    private long ordersProcessed;
    private long dataImports;
    private LocalDateTime lastActive;
}
