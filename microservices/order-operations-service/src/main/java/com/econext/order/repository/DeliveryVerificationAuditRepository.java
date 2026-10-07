package com.econext.order.repository;

import com.econext.order.entity.DeliveryVerificationAudit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DeliveryVerificationAuditRepository extends JpaRepository<DeliveryVerificationAudit, Long> {
    List<DeliveryVerificationAudit> findByOrderId(Long orderId);
    List<DeliveryVerificationAudit> findByShipmentId(Long shipmentId);
    List<DeliveryVerificationAudit> findAllByOrderByVerificationTimestampDesc();
}
