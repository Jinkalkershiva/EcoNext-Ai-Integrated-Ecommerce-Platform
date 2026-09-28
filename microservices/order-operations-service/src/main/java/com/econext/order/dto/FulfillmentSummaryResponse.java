package com.econext.order.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FulfillmentSummaryResponse {

    // Top Level Real-Time Counts
    private long totalOrders;
    private long totalShipments;
    private long activeShipments;
    private long pendingShipments;
    private long inTransitShipments;
    private long outForDeliveryShipments;
    private long deliveredShipments;
    private long failedDeliveryShipments;
    private long cancelledShipments;
    private long returnedShipments;

    // Infrastructure & Container Counts
    private long totalContainers;
    private long activeContainers;
    private long totalTrackingEvents;
    private long shipmentsWithGps;
    private long shipmentsWithRecentGps;

    // Categorized Status Maps
    private Map<String, Long> shipmentStatusCounts;
    private Map<String, Long> containerStatusCounts;
    private Map<String, Long> orderStatusCounts;

    // Live Operational Entities
    private List<ShipmentResponse> inTransitShipmentsList;
    private List<ShipmentResponse> recentGpsUpdates;
    private List<LogisticsTrackingResponse> recentActivityStream;
}
