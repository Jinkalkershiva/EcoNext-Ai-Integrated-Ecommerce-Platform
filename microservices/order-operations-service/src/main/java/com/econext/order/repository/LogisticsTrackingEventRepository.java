package com.econext.order.repository;

import com.econext.order.entity.LogisticsTrackingEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LogisticsTrackingEventRepository extends JpaRepository<LogisticsTrackingEvent, Long> {

    List<LogisticsTrackingEvent> findByShipmentIdOrderByTimestampAsc(Long shipmentId);

    List<LogisticsTrackingEvent> findByContainerIdOrderByTimestampAsc(Long containerId);

    @org.springframework.data.jpa.repository.Query("SELECT e FROM LogisticsTrackingEvent e ORDER BY e.timestamp DESC")
    List<LogisticsTrackingEvent> findRecentEvents(org.springframework.data.domain.Pageable pageable);
}

