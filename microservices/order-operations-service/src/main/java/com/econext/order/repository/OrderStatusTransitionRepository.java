package com.econext.order.repository;

import com.econext.order.entity.OrderStatusTransition;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderStatusTransitionRepository extends JpaRepository<OrderStatusTransition, Long> {
    List<OrderStatusTransition> findByOrderIdOrderByTimestampAsc(Long orderId);
    Page<OrderStatusTransition> findByStaffUsernameOrderByTimestampDesc(String staffUsername, Pageable pageable);
    List<OrderStatusTransition> findTop10ByOrderByTimestampDesc();
}
