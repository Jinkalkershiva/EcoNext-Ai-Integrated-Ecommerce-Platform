package com.econext.order.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "operational_order_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OperationalOrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    @JsonIgnore
    private OperationalOrder order;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "product_name", nullable = false, length = 255)
    private String productName;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "price_at_purchase", nullable = false, precision = 10, scale = 2)
    private BigDecimal priceAtPurchase;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal subtotal;

    // Snapshot of product return policy & physical attributes at order creation
    @Column(name = "return_eligible")
    @Builder.Default
    private Boolean returnEligible = true;

    @Column(name = "return_window_days")
    @Builder.Default
    private Integer returnWindowDays = 7;

    @Column(name = "return_policy", length = 255)
    private String returnPolicy;

    @Column(name = "condition_required", length = 255)
    private String conditionRequired;

    @Column(name = "weight_kg", precision = 10, scale = 3)
    @Builder.Default
    private BigDecimal weightKg = new BigDecimal("1.000");

    @Column(name = "volume_m3", precision = 10, scale = 4)
    @Builder.Default
    private BigDecimal volumeM3 = new BigDecimal("0.0050");
}
