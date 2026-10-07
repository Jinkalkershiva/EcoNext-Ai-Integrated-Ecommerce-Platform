package com.econext.order.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateDriverRequest {

    @NotBlank(message = "Driver code is required")
    private String driverCode;

    @NotBlank(message = "Driver name is required")
    private String name;

    private String phone;

    private String email;

    private String licenseNumber;

    @NotBlank(message = "Warehouse is required")
    private String warehouse;

    private String currentVehicleNumber;
}
