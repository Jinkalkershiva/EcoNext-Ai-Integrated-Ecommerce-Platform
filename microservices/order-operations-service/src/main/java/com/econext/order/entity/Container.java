package com.econext.order.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "containers", indexes = {
    @Index(name = "idx_container_status", columnList = "status"),
    @Index(name = "idx_container_destination", columnList = "destination"),
    @Index(name = "idx_container_last_location_update", columnList = "last_location_update"),
    @Index(name = "idx_container_code", columnList = "container_code")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Container {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "container_code", nullable = false, unique = true, length = 64)
    private String containerCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private ContainerStatus status = ContainerStatus.CREATED;

    @Column(length = 128)
    private String warehouse;

    @Column(name = "driver_id")
    private Long driverId;

    @Column(name = "driver_code", length = 64)
    private String driverCode;

    @Column(name = "driver_name", length = 100)
    private String driverName;

    @Column(nullable = false, length = 128)
    private String origin;

    @Column(nullable = false, length = 128)
    private String destination;

    @Column(length = 255)
    private String route;

    @Column(name = "vehicle_number", length = 64)
    private String vehicleNumber;

    @Column(name = "max_weight_kg", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal maxWeightKg = new BigDecimal("25000.00");

    @Column(name = "max_volume_m3", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal maxVolumeM3 = new BigDecimal("80.00");

    @Column(name = "used_weight_kg", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal usedWeightKg = BigDecimal.ZERO;

    @Column(name = "used_volume_m3", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal usedVolumeM3 = BigDecimal.ZERO;

    @Column(name = "current_latitude", precision = 10, scale = 7)
    private BigDecimal currentLatitude;

    @Column(name = "current_longitude", precision = 10, scale = 7)
    private BigDecimal currentLongitude;

    @Column(name = "last_location_update")
    private LocalDateTime lastLocationUpdate;

    @OneToMany(mappedBy = "container", cascade = {CascadeType.PERSIST, CascadeType.MERGE}, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Shipment> shipments = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public boolean canAcceptShipments() {
        return this.status == ContainerStatus.CREATED || this.status == ContainerStatus.AVAILABLE || this.status == ContainerStatus.PACKED || this.status == ContainerStatus.ASSIGNED;
    }

    public BigDecimal getRemainingWeightKg() {
        if (maxWeightKg == null) return BigDecimal.ZERO;
        BigDecimal used = usedWeightKg != null ? usedWeightKg : BigDecimal.ZERO;
        return maxWeightKg.subtract(used).max(BigDecimal.ZERO);
    }

    public BigDecimal getRemainingVolumeM3() {
        if (maxVolumeM3 == null) return BigDecimal.ZERO;
        BigDecimal used = usedVolumeM3 != null ? usedVolumeM3 : BigDecimal.ZERO;
        return maxVolumeM3.subtract(used).max(BigDecimal.ZERO);
    }
}
