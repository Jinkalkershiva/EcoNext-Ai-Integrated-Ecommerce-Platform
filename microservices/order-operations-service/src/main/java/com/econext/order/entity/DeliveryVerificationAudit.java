package com.econext.order.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "delivery_verification_audits", indexes = {
    @Index(name = "idx_deliv_aud_order", columnList = "order_id"),
    @Index(name = "idx_deliv_aud_shipment", columnList = "shipment_id"),
    @Index(name = "idx_deliv_aud_time", columnList = "verification_timestamp")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliveryVerificationAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "shipment_id")
    private Long shipmentId;

    @Column(name = "verified_by", nullable = false, length = 100)
    private String verifiedBy;

    @Column(name = "customer_id")
    private Long customerId;

    @Column(name = "verification_method", nullable = false, length = 50)
    @Builder.Default
    private String verificationMethod = "CUSTOMER_OTP";

    @Column(name = "verification_timestamp", nullable = false)
    private LocalDateTime verificationTimestamp;

    @Column(name = "previous_order_status", length = 50)
    private String previousOrderStatus;

    @Column(name = "new_order_status", length = 50)
    private String newOrderStatus;

    @Column(name = "delivery_attempt_info", columnDefinition = "TEXT")
    private String deliveryAttemptInfo;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
