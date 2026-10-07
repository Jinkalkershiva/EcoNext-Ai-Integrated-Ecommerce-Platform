package com.econext.order.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "logistics_drivers", indexes = {
    @Index(name = "idx_driver_code", columnList = "driver_code"),
    @Index(name = "idx_driver_warehouse", columnList = "warehouse"),
    @Index(name = "idx_driver_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Driver {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "driver_code", nullable = false, unique = true, length = 64)
    private String driverCode;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 32)
    private String phone;

    @Column(length = 128)
    private String email;

    @Column(name = "license_number", length = 64)
    private String licenseNumber;

    @Column(nullable = false, length = 128)
    private String warehouse;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private DriverStatus status = DriverStatus.AVAILABLE;

    @Column(name = "current_vehicle_number", length = 64)
    private String currentVehicleNumber;

    @Column(name = "assigned_shipment_id")
    private Long assignedShipmentId;

    @Column(name = "assigned_container_id")
    private Long assignedContainerId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
