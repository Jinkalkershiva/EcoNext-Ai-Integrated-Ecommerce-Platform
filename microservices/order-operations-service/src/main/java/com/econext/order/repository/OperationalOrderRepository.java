package com.econext.order.repository;

import com.econext.order.entity.OperationalOrder;
import com.econext.order.entity.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface OperationalOrderRepository extends JpaRepository<OperationalOrder, Long> {

    Optional<OperationalOrder> findByDjangoOrderId(Long djangoOrderId);

    Page<OperationalOrder> findByCurrentStatus(OrderStatus status, Pageable pageable);

    @Query("SELECT o FROM OperationalOrder o WHERE " +
           "(:status IS NULL OR o.currentStatus = :status) AND " +
           "(:search IS NULL OR LOWER(o.customerUsername) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(o.customerName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(o.customerEmail) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " CAST(o.id AS string) LIKE CONCAT('%', :search, '%')) AND " +
           "(:fromTime IS NULL OR o.createdAt >= :fromTime) AND " +
           "(:toTime IS NULL OR o.createdAt <= :toTime)")
    Page<OperationalOrder> searchOrders(
            @Param("status") OrderStatus status,
            @Param("search") String search,
            @Param("fromTime") LocalDateTime fromTime,
            @Param("toTime") LocalDateTime toTime,
            Pageable pageable
    );

    @Query("SELECT o.currentStatus, COUNT(o) FROM OperationalOrder o GROUP BY o.currentStatus")
    List<Object[]> countOrdersByStatus();

    @Query("SELECT SUM(o.totalAmount) FROM OperationalOrder o WHERE o.currentStatus != 'CANCELLED' AND o.currentStatus != 'RETURNED'")
    BigDecimal sumTotalRevenue();

    @Query("SELECT SUM(o.totalAmount) FROM OperationalOrder o WHERE o.currentStatus = 'DELIVERED'")
    BigDecimal sumDeliveredRevenue();
}
