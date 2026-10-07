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
@Table(name = "shipments", indexes = {
    @Index(name = "idx_shipment_order_id", columnList = "order_id"),
    @Index(name = "idx_shipment_status", columnList = "status"),
    @Index(name = "idx_shipment_container_id", columnList = "container_id"),
    @Index(name = "idx_shipment_tracking_number", columnList = "tracking_number"),
    @Index(name = "idx_shipment_destination", columnList = "destination"),
    @Index(name = "idx_shipment_last_location_update", columnList = "last_location_update")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Shipment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "shipment_number", nullable = false, unique = true, length = 64)
    private String shipmentNumber;

    @Column(name = "order_id", nullable = true)
    private Long orderId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "container_id")
    private Container container;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private ShipmentStatus status = ShipmentStatus.OPEN;

    @Column(name = "carrier_name", length = 100)
    private String carrierName;

    @Column(name = "tracking_number", length = 100)
    private String trackingNumber;

    @Column(name = "vehicle_number", length = 64)
    private String vehicleNumber;

    @Column(length = 128)
    private String warehouse;

    @Column(name = "driver_id")
    private Long driverId;

    @Column(name = "driver_code", length = 64)
    private String driverCode;

    @Column(name = "driver_name", length = 100)
    private String driverName;

    @Column(name = "driver_phone", length = 32)
    private String driverPhone;

    @Column(length = 128)
    private String origin;

    @Column(length = 128)
    private String destination;

    @Column(length = 255)
    private String route;

    // Physical capacity & load telemetry
    @Column(name = "max_weight_kg", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal maxWeight = new BigDecimal("10000.00");

    @Column(name = "max_volume_m3", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal maxVolume = new BigDecimal("35.00");

    @Column(name = "used_weight_kg", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal usedWeight = BigDecimal.ZERO;

    @Column(name = "used_volume_m3", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal usedVolume = BigDecimal.ZERO;

    @Column(name = "current_latitude", precision = 10, scale = 7)
    private BigDecimal currentLatitude;

    @Column(name = "current_longitude", precision = 10, scale = 7)
    private BigDecimal currentLongitude;

    @Column(name = "last_location_update")
    private LocalDateTime lastLocationUpdate;

    @Column(name = "estimated_delivery")
    private LocalDateTime estimatedDelivery;

    @Column(name = "dispatched_at")
    private LocalDateTime dispatchedAt;

    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

    @OneToMany(mappedBy = "shipment", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    private List<ShipmentItem> items = new ArrayList<>();

    @OneToMany(mappedBy = "shipment", fetch = FetchType.LAZY)
    @Builder.Default
    private List<OperationalOrder> assignedOrders = new ArrayList<>();

    @Version
    private Long version;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public boolean canAcceptOrders() {
        return this.status == ShipmentStatus.OPEN || this.status == ShipmentStatus.CREATED || this.status == ShipmentStatus.ASSIGNED;
    }

    public BigDecimal getRemainingWeight() {
        if (maxWeight == null) return BigDecimal.ZERO;
        BigDecimal used = usedWeight != null ? usedWeight : BigDecimal.ZERO;
        return maxWeight.subtract(used).max(BigDecimal.ZERO);
    }

    public BigDecimal getRemainingVolume() {
        if (maxVolume == null) return BigDecimal.ZERO;
        BigDecimal used = usedVolume != null ? usedVolume : BigDecimal.ZERO;
        return maxVolume.subtract(used).max(BigDecimal.ZERO);
    }
}
