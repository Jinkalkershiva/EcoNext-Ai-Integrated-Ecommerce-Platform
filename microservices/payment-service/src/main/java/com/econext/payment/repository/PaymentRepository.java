package com.econext.payment.repository;

import com.econext.payment.entity.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<PaymentTransaction, Long> {

    Optional<PaymentTransaction> findByOrderId(Long orderId);

    Optional<PaymentTransaction> findByRazorpayOrderId(String razorpayOrderId);

    List<PaymentTransaction> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<PaymentTransaction> findAllByOrderByCreatedAtDesc();
}
