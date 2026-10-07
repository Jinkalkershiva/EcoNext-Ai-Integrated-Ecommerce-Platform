package com.econext.order.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "route_exception_audits", indexes = {
    @Index(name = "idx_route_aud_shipment", columnList = "shipment_id"),
    @Index(name = "idx_route_aud_order", columnList = "order_id"),
    @Index(name = "idx_route_aud_time", columnList = "timestamp")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RouteExceptionAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "shipment_id", nullable = false)
    private Long shipmentId;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "actor_username", nullable = false, length = 100)
    private String actorUsername;

    @Column(name = "actor_role", length = 100)
    private String actorRole;

    @Column(name = "expected_route", length = 255)
    private String expectedRoute;

    @Column(name = "actual_shipment_route", length = 255)
    private String actualShipmentRoute;

    @Column(name = "exception_reason", nullable = false, columnDefinition = "TEXT")
    private String exceptionReason;

    @CreationTimestamp
    @Column(name = "timestamp", nullable = false, updatable = false)
    private LocalDateTime timestamp;
}
