package com.econext.order.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignDriverTruckRequest {

    private Long driverId;

    private String driverCode;

    private Long containerId;

    private String truckCode;

    private String vehicleNumber;
}
