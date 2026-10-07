package com.econext.order.repository;

import com.econext.order.entity.OrderReturnRequest;
import com.econext.order.entity.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrderReturnRequestRepository extends JpaRepository<OrderReturnRequest, Long> {
    List<OrderReturnRequest> findByOrderId(Long orderId);
    List<OrderReturnRequest> findByCustomerId(Long customerId);
    List<OrderReturnRequest> findByStatus(OrderStatus status);
    List<OrderReturnRequest> findAllByOrderByRequestedAtDesc();
    boolean existsByOrderIdAndStatusIn(Long orderId, List<OrderStatus> statuses);
}
