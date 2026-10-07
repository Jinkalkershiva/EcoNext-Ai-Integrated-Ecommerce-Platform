package com.econext.payment.repository;

import com.econext.payment.entity.RefundTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RefundRepository extends JpaRepository<RefundTransaction, Long> {
    Optional<RefundTransaction> findByRefundId(String refundId);
    Optional<RefundTransaction> findByIdempotencyKey(String idempotencyKey);
    List<RefundTransaction> findByOrderId(Long orderId);
    List<RefundTransaction> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<RefundTransaction> findAllByOrderByCreatedAtDesc();
    boolean existsByOrderIdAndStatus(Long orderId, String status);
}
