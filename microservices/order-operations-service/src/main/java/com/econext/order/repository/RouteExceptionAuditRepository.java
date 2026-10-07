package com.econext.order.repository;

import com.econext.order.entity.RouteExceptionAudit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RouteExceptionAuditRepository extends JpaRepository<RouteExceptionAudit, Long> {
    List<RouteExceptionAudit> findByShipmentId(Long shipmentId);
    List<RouteExceptionAudit> findByOrderId(Long orderId);
    List<RouteExceptionAudit> findAllByOrderByTimestampDesc();
}
