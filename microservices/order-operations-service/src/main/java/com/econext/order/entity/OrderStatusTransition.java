package com.econext.order.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "operational_order_transitions", indexes = {
    @Index(name = "idx_trans_order", columnList = "order_id"),
    @Index(name = "idx_trans_staff", columnList = "staff_username"),
    @Index(name = "idx_trans_time", columnList = "timestamp")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderStatusTransition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", nullable = false, length = 32)
    private OrderStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", nullable = false, length = 32)
    private OrderStatus toStatus;

    @Column(name = "reason_note", length = 512)
    private String reasonNote;

    @Column(name = "staff_id")
    private Long staffId;

    @Column(name = "staff_username", nullable = false, length = 64)
    private String staffUsername;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime timestamp;
}
