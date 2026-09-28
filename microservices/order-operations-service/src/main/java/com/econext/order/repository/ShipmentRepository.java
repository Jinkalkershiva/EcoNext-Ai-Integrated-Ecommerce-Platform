package com.econext.order.repository;

import com.econext.order.entity.Shipment;
import com.econext.order.entity.ShipmentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShipmentRepository extends JpaRepository<Shipment, Long> {

    Optional<Shipment> findByShipmentNumber(String shipmentNumber);

    List<Shipment> findByOrderId(Long orderId);

    List<Shipment> findByContainerId(Long containerId);

    List<Shipment> findByStatus(ShipmentStatus status);

    @Query("SELECT s FROM Shipment s WHERE " +
           "(:orderId IS NULL OR s.orderId = :orderId) AND " +
           "(:status IS NULL OR s.status = :status) AND " +
           "(:containerId IS NULL OR (s.container IS NOT NULL AND s.container.id = :containerId)) AND " +
           "(:search IS NULL OR LOWER(s.shipmentNumber) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(s.trackingNumber) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(s.carrierName) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Shipment> searchShipments(
            @Param("orderId") Long orderId,
            @Param("status") ShipmentStatus status,
            @Param("containerId") Long containerId,
            @Param("search") String search,
            Pageable pageable
    );

    @Query("SELECT s.status, COUNT(s) FROM Shipment s GROUP BY s.status")
    List<Object[]> countShipmentsByStatus();

    @Query("SELECT COUNT(s) FROM Shipment s WHERE s.status NOT IN (com.econext.order.entity.ShipmentStatus.DELIVERED, com.econext.order.entity.ShipmentStatus.CANCELLED, com.econext.order.entity.ShipmentStatus.RETURNED)")
    long countActiveShipments();

    @Query("SELECT COUNT(s) FROM Shipment s WHERE s.currentLatitude IS NOT NULL AND s.currentLongitude IS NOT NULL")
    long countShipmentsWithGps();

    @Query("SELECT COUNT(s) FROM Shipment s WHERE s.lastLocationUpdate IS NOT NULL AND s.lastLocationUpdate >= :since")
    long countShipmentsWithRecentGps(@Param("since") java.time.LocalDateTime since);

    @Query("SELECT s FROM Shipment s WHERE s.status IN (com.econext.order.entity.ShipmentStatus.DISPATCHED, com.econext.order.entity.ShipmentStatus.IN_TRANSIT, com.econext.order.entity.ShipmentStatus.ARRIVED_AT_HUB, com.econext.order.entity.ShipmentStatus.OUT_FOR_DELIVERY) ORDER BY s.updatedAt DESC")
    List<Shipment> findInTransitShipments(Pageable pageable);

    @Query("SELECT s FROM Shipment s WHERE s.currentLatitude IS NOT NULL ORDER BY s.lastLocationUpdate DESC")
    List<Shipment> findRecentGpsUpdates(Pageable pageable);
}

