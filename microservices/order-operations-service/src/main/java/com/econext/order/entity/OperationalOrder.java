package com.econext.order.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "operational_orders", indexes = {
    @Index(name = "idx_op_order_customer", columnList = "customer_username"),
    @Index(name = "idx_op_order_status", columnList = "current_status"),
    @Index(name = "idx_op_order_created", columnList = "created_at"),
    @Index(name = "idx_op_order_shipment_id", columnList = "shipment_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OperationalOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "customer_id")
    private Long customerId;

    @Column(name = "customer_username", nullable = false, length = 64)
    private String customerUsername;

    @Column(name = "customer_email", length = 128)
    private String customerEmail;

    @Column(name = "customer_name", length = 128)
    private String customerName;

    @Column(name = "customer_phone", length = 32)
    private String customerPhone;

    @Column(name = "total_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "shipping_address", columnDefinition = "TEXT")
    private String shippingAddress;

    @Column(length = 100)
    private String city;

    @Column(length = 100)
    private String state;

    @Column(length = 20)
    private String zipcode;

    @Column(length = 100)
    private String country;

    @Enumerated(EnumType.STRING)
    @Column(name = "current_status", nullable = false, length = 32)
    @Builder.Default
    private OrderStatus currentStatus = OrderStatus.ORDER_PLACED;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shipment_id")
    @JsonIgnore
    private Shipment shipment;

    @Column(name = "carrier_name", length = 100)
    private String carrierName;

    @Column(name = "tracking_number", length = 100)
    private String trackingNumber;

    @Column(name = "django_order_id")
    private Long djangoOrderId;

    @Column(name = "order_number", length = 64)
    private String orderNumber;

    @Column(name = "total_weight_kg", precision = 10, scale = 3)
    @Builder.Default
    private BigDecimal totalWeightKg = new BigDecimal("1.500");

    @Column(name = "total_volume_m3", precision = 10, scale = 4)
    @Builder.Default
    private BigDecimal totalVolumeM3 = new BigDecimal("0.0060");

    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

    @Column(name = "cancellation_reason", length = 500)
    private String cancellationReason;

    @Column(name = "refund_status", length = 32)
    @Builder.Default
    private String refundStatus = "NONE";

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    private List<OperationalOrderItem> items = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public String getOrderReferenceNumber() {
        if (orderNumber != null && !orderNumber.isBlank()) {
            return orderNumber;
        }
        if (djangoOrderId != null) {
            return "ORD-" + djangoOrderId;
        }
        return id != null ? "ORD-" + id : "ORD-PENDING";
    }

    public BigDecimal resolveWeight() {
        if (totalWeightKg != null && totalWeightKg.compareTo(BigDecimal.ZERO) > 0) {
            return totalWeightKg;
        }
        if (items != null && !items.isEmpty()) {
            BigDecimal sum = BigDecimal.ZERO;
            for (OperationalOrderItem it : items) {
                BigDecimal w = it.getWeightKg() != null ? it.getWeightKg() : new BigDecimal("1.000");
                sum = sum.add(w.multiply(new BigDecimal(it.getQuantity() != null ? it.getQuantity() : 1)));
            }
            return sum;
        }
        return new BigDecimal("1.500");
    }

    public BigDecimal resolveVolume() {
        if (totalVolumeM3 != null && totalVolumeM3.compareTo(BigDecimal.ZERO) > 0) {
            return totalVolumeM3;
        }
        if (items != null && !items.isEmpty()) {
            BigDecimal sum = BigDecimal.ZERO;
            for (OperationalOrderItem it : items) {
                BigDecimal v = it.getVolumeM3() != null ? it.getVolumeM3() : new BigDecimal("0.0050");
                sum = sum.add(v.multiply(new BigDecimal(it.getQuantity() != null ? it.getQuantity() : 1)));
            }
            return sum;
        }
        return new BigDecimal("0.0060");
    }
}
