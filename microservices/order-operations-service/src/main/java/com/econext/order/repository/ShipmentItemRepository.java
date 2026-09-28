package com.econext.order.repository;

import com.econext.order.entity.ShipmentItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ShipmentItemRepository extends JpaRepository<ShipmentItem, Long> {

    List<ShipmentItem> findByShipmentId(Long shipmentId);

    List<ShipmentItem> findByOrderItemId(Long orderItemId);

    @Query("SELECT COALESCE(SUM(si.quantity), 0) FROM ShipmentItem si WHERE si.orderItemId = :orderItemId AND si.shipment.status != 'CANCELLED'")
    int sumAllocatedQuantityByOrderItemId(@Param("orderItemId") Long orderItemId);
}
