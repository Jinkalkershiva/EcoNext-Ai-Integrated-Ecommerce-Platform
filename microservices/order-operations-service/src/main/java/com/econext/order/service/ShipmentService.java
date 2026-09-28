package com.econext.order.service;

import com.econext.order.dto.CreateShipmentRequest;
import com.econext.order.dto.LogisticsTrackingResponse;
import com.econext.order.dto.ShipmentItemResponse;
import com.econext.order.dto.ShipmentResponse;
import com.econext.order.dto.UpdateShipmentLocationRequest;
import com.econext.order.dto.event.ShipmentLocationUpdatedEvent;
import com.econext.order.dto.event.ShipmentStatusUpdatedEvent;
import com.econext.order.entity.*;
import com.econext.order.exception.GlobalExceptionHandler.BadRequestException;
import com.econext.order.exception.GlobalExceptionHandler.ResourceNotFoundException;
import com.econext.order.kafka.FulfillmentEventProducer;
import com.econext.order.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ShipmentService {

    private final ShipmentRepository shipmentRepository;
    private final ShipmentItemRepository shipmentItemRepository;
    private final ContainerRepository containerRepository;
    private final OperationalOrderRepository orderRepository;
    private final LogisticsTrackingEventRepository trackingEventRepository;
    private final OrderStatusTransitionRepository transitionRepository;
    private final DjangoOrderSyncService djangoOrderSyncService;
    private final com.econext.order.kafka.FulfillmentEventProducer fulfillmentEventProducer;

    private static final Map<ShipmentStatus, Set<ShipmentStatus>> ALLOWED_SHIPMENT_TRANSITIONS = Map.ofEntries(
            Map.entry(ShipmentStatus.CREATED, Set.of(ShipmentStatus.PACKED, ShipmentStatus.CANCELLED)),
            Map.entry(ShipmentStatus.PACKED, Set.of(ShipmentStatus.DISPATCHED, ShipmentStatus.CANCELLED)),
            Map.entry(ShipmentStatus.DISPATCHED, Set.of(ShipmentStatus.IN_TRANSIT, ShipmentStatus.CANCELLED)),
            Map.entry(ShipmentStatus.IN_TRANSIT, Set.of(ShipmentStatus.ARRIVED_AT_HUB, ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.CANCELLED)),
            Map.entry(ShipmentStatus.ARRIVED_AT_HUB, Set.of(ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.IN_TRANSIT, ShipmentStatus.CANCELLED)),
            Map.entry(ShipmentStatus.OUT_FOR_DELIVERY, Set.of(ShipmentStatus.DELIVERED, ShipmentStatus.FAILED_DELIVERY, ShipmentStatus.CANCELLED)),
            Map.entry(ShipmentStatus.FAILED_DELIVERY, Set.of(ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.RETURNED)),
            Map.entry(ShipmentStatus.DELIVERED, Set.of(ShipmentStatus.RETURNED)),
            Map.entry(ShipmentStatus.RETURNED, Set.of()),
            Map.entry(ShipmentStatus.CANCELLED, Set.of())
    );

    @Transactional
    public ShipmentResponse createShipment(CreateShipmentRequest request, Long staffId, String staffUsername) {
        // idx-01: Shipment Service → Order Operations Service
        // reason: Validate order existence and remaining unfulfilled item quantities.
        OperationalOrder order = orderRepository.findById(request.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + request.getOrderId()));

        Container container = null;
        if (request.getContainerId() != null) {
            container = containerRepository.findById(request.getContainerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Container not found with ID: " + request.getContainerId()));
        }

        // Validate item allocation and ensure quantity does not exceed remaining order item quantity
        Map<Long, OperationalOrderItem> orderItemMap = order.getItems().stream()
                .collect(Collectors.toMap(OperationalOrderItem::getId, item -> item));

        List<ShipmentItem> shipmentItems = new ArrayList<>();
        for (CreateShipmentRequest.ShipmentItemAllocation alloc : request.getItems()) {
            OperationalOrderItem orderItem = orderItemMap.get(alloc.getOrderItemId());
            if (orderItem == null) {
                throw new BadRequestException("OrderItem with ID " + alloc.getOrderItemId() + " does not belong to Order #" + order.getId());
            }

            int alreadyAllocated = shipmentItemRepository.sumAllocatedQuantityByOrderItemId(alloc.getOrderItemId());
            int remaining = orderItem.getQuantity() - alreadyAllocated;
            if (alloc.getQuantity() > remaining) {
                throw new BadRequestException("Requested quantity " + alloc.getQuantity() + " exceeds remaining unallocated quantity " +
                        remaining + " for item: " + orderItem.getProductName());
            }

            ShipmentItem item = ShipmentItem.builder()
                    .orderItemId(alloc.getOrderItemId())
                    .productId(orderItem.getProductId())
                    .productName(orderItem.getProductName())
                    .quantity(alloc.getQuantity())
                    .build();
            shipmentItems.add(item);
        }

        String shipmentNumber = "SHP-" + order.getId() + "-" + String.format("%02d", shipmentRepository.findByOrderId(order.getId()).size() + 1);
        String trackingNumber = request.getTrackingNumber() != null && !request.getTrackingNumber().isBlank()
                ? request.getTrackingNumber()
                : "ECO-AWB-" + (order.getId() * 100 + shipmentItems.size());
        String carrierName = request.getCarrierName() != null && !request.getCarrierName().isBlank()
                ? request.getCarrierName()
                : (order.getCarrierName() != null ? order.getCarrierName() : "EcoExpress Carbon-Neutral");

        String origin = request.getOrigin() != null && !request.getOrigin().isBlank()
                ? request.getOrigin()
                : (container != null ? container.getOrigin() : "Central Warehouse Hub");
        String destination = request.getDestination() != null && !request.getDestination().isBlank()
                ? request.getDestination()
                : (order.getCity() != null ? order.getCity() + ", " + (order.getState() != null ? order.getState() : "IN") : "Customer Destination");

        Shipment shipment = Shipment.builder()
                .shipmentNumber(shipmentNumber)
                .orderId(order.getId())
                .container(container)
                .status(ShipmentStatus.CREATED)
                .carrierName(carrierName)
                .trackingNumber(trackingNumber)
                .vehicleNumber(request.getVehicleNumber())
                .origin(origin)
                .destination(destination)
                .route(request.getRoute())
                .currentLatitude(request.getCurrentLatitude())
                .currentLongitude(request.getCurrentLongitude())
                .lastLocationUpdate(request.getCurrentLatitude() != null ? LocalDateTime.now() : null)
                .estimatedDelivery(request.getEstimatedDelivery() != null ? request.getEstimatedDelivery() : LocalDateTime.now().plusDays(4))
                .build();

        for (ShipmentItem item : shipmentItems) {
            item.setShipment(shipment);
        }
        shipment.setItems(shipmentItems);

        Shipment saved = shipmentRepository.save(shipment);

        // idx-02: Shipment Service → Tracking Event Repository
        // reason: Persist initial shipment created tracking event.
        LogisticsTrackingEvent tracking = LogisticsTrackingEvent.builder()
                .shipmentId(saved.getId())
                .containerId(container != null ? container.getId() : null)
                .status(ShipmentStatus.CREATED.name())
                .locationName(origin)
                .latitude(saved.getCurrentLatitude())
                .longitude(saved.getCurrentLongitude())
                .description("Shipment created with " + shipmentItems.size() + " allocated item(s) by " + (staffUsername != null ? staffUsername : "SYSTEM"))
                .build();
        trackingEventRepository.save(tracking);

        // idx-06: Order Operations Service → Kafka Topic (shipment.status.updated)
        // reason: Broadcast initial shipment created event.
        fulfillmentEventProducer.publishShipmentStatusUpdated(ShipmentStatusUpdatedEvent.builder()
                .shipmentId(saved.getId())
                .shipmentNumber(saved.getShipmentNumber())
                .orderId(saved.getOrderId())
                .status(ShipmentStatus.CREATED.name())
                .previousStatus(null)
                .carrierName(saved.getCarrierName())
                .trackingNumber(saved.getTrackingNumber())
                .timestamp(LocalDateTime.now())
                .build());

        return mapToResponse(saved);
    }

    @Transactional(readOnly = true)
    public ShipmentResponse getShipmentById(Long id) {
        Shipment shipment = shipmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment not found with ID: " + id));
        return mapToResponse(shipment);
    }

    @Transactional(readOnly = true)
    public List<ShipmentResponse> getShipmentsByOrderId(Long orderId) {
        return shipmentRepository.findByOrderId(orderId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public ShipmentResponse updateShipmentStatus(Long id, ShipmentStatus targetStatus, Long staffId, String staffUsername) {
        Shipment shipment = shipmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment not found with ID: " + id));

        ShipmentStatus currentStatus = shipment.getStatus();
        if (currentStatus == targetStatus) {
            return mapToResponse(shipment);
        }

        Set<ShipmentStatus> allowed = ALLOWED_SHIPMENT_TRANSITIONS.getOrDefault(currentStatus, Collections.emptySet());
        if (!allowed.contains(targetStatus)) {
            throw new BadRequestException("Invalid shipment state transition from " + currentStatus + " to " + targetStatus);
        }

        shipment.setStatus(targetStatus);
        Shipment updated = shipmentRepository.save(shipment);

        // idx-03: Shipment Service → Tracking Event Repository
        // reason: Record shipment status transition audit log.
        LogisticsTrackingEvent event = LogisticsTrackingEvent.builder()
                .shipmentId(updated.getId())
                .containerId(updated.getContainer() != null ? updated.getContainer().getId() : null)
                .status(targetStatus.name())
                .locationName(updated.getDestination())
                .latitude(updated.getCurrentLatitude())
                .longitude(updated.getCurrentLongitude())
                .description("Shipment status updated to " + targetStatus.name() + " by " + (staffUsername != null ? staffUsername : "STAFF"))
                .build();
        trackingEventRepository.save(event);

        // idx-06: Order Operations Service → Kafka Topic (shipment.status.updated)
        // reason: Broadcast shipment status lifecycle transition for notifications and live tracking.
        fulfillmentEventProducer.publishShipmentStatusUpdated(ShipmentStatusUpdatedEvent.builder()
                .shipmentId(updated.getId())
                .shipmentNumber(updated.getShipmentNumber())
                .orderId(updated.getOrderId())
                .status(targetStatus.name())
                .previousStatus(currentStatus.name())
                .carrierName(updated.getCarrierName())
                .trackingNumber(updated.getTrackingNumber())
                .timestamp(LocalDateTime.now())
                .build());

        // Update derived OperationalOrder status if applicable
        evaluateAndSyncOrderStatus(updated.getOrderId(), staffId, staffUsername);

        return mapToResponse(updated);
    }

    @Transactional
    public ShipmentResponse updateShipmentLocation(Long id, UpdateShipmentLocationRequest request, Long staffId, String staffUsername) {
        Shipment shipment = shipmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment not found with ID: " + id));

        shipment.setCurrentLatitude(request.getLatitude());
        shipment.setCurrentLongitude(request.getLongitude());
        shipment.setLastLocationUpdate(LocalDateTime.now());
        Shipment updated = shipmentRepository.save(shipment);

        // idx-04: Shipment Service → Tracking Event Repository
        // reason: Store physical shipment GPS location update and location milestone.
        LogisticsTrackingEvent event = LogisticsTrackingEvent.builder()
                .shipmentId(updated.getId())
                .containerId(updated.getContainer() != null ? updated.getContainer().getId() : null)
                .status(updated.getStatus().name())
                .locationName(request.getLocationName() != null ? request.getLocationName() : updated.getDestination())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .description(request.getNote() != null ? request.getNote() : "GPS position update: lat=" + request.getLatitude() + ", lon=" + request.getLongitude())
                .build();
        trackingEventRepository.save(event);

        // idx-07: Order Operations Service → Kafka Topic (shipment.location.updated)
        // reason: Broadcast real-time physical vehicle GPS coordinate update.
        fulfillmentEventProducer.publishShipmentLocationUpdated(ShipmentLocationUpdatedEvent.builder()
                .shipmentId(updated.getId())
                .shipmentNumber(updated.getShipmentNumber())
                .orderId(updated.getOrderId())
                .latitude(updated.getCurrentLatitude())
                .longitude(updated.getCurrentLongitude())
                .locationName(request.getLocationName() != null ? request.getLocationName() : updated.getDestination())
                .status(updated.getStatus().name())
                .trackingNumber(updated.getTrackingNumber())
                .vehicleNumber(updated.getVehicleNumber())
                .note(request.getNote())
                .timestamp(LocalDateTime.now())
                .build());

        return mapToResponse(updated);
    }

    private void evaluateAndSyncOrderStatus(Long orderId, Long staffId, String staffUsername) {
        try {
            Optional<OperationalOrder> orderOpt = orderRepository.findById(orderId);
            if (orderOpt.isEmpty()) return;
            OperationalOrder order = orderOpt.get();
            List<Shipment> shipments = shipmentRepository.findByOrderId(orderId);
            if (shipments.isEmpty()) return;

            boolean allDelivered = shipments.stream().allMatch(s -> s.getStatus() == ShipmentStatus.DELIVERED);
            boolean anyOutForDelivery = shipments.stream().anyMatch(s -> s.getStatus() == ShipmentStatus.OUT_FOR_DELIVERY);
            boolean anyInTransit = shipments.stream().anyMatch(s -> s.getStatus() == ShipmentStatus.IN_TRANSIT || s.getStatus() == ShipmentStatus.ARRIVED_AT_HUB);
            boolean anyDispatched = shipments.stream().anyMatch(s -> s.getStatus() == ShipmentStatus.DISPATCHED);
            boolean anyPacked = shipments.stream().anyMatch(s -> s.getStatus() == ShipmentStatus.PACKED);

            OrderStatus newStatus = null;
            if (allDelivered && order.getCurrentStatus() != OrderStatus.DELIVERED && order.getCurrentStatus() != OrderStatus.CANCELLED) {
                newStatus = OrderStatus.DELIVERED;
            } else if (anyOutForDelivery && order.getCurrentStatus() != OrderStatus.DELIVERED && order.getCurrentStatus() != OrderStatus.CANCELLED) {
                newStatus = OrderStatus.OUT_FOR_DELIVERY;
            } else if (anyInTransit && order.getCurrentStatus() != OrderStatus.DELIVERED && order.getCurrentStatus() != OrderStatus.OUT_FOR_DELIVERY && order.getCurrentStatus() != OrderStatus.CANCELLED) {
                newStatus = OrderStatus.IN_TRANSIT;
            } else if (anyDispatched && (order.getCurrentStatus() == OrderStatus.PROCESSING || order.getCurrentStatus() == OrderStatus.PACKED)) {
                newStatus = OrderStatus.SHIPPED;
            } else if (anyPacked && order.getCurrentStatus() == OrderStatus.PROCESSING) {
                newStatus = OrderStatus.PACKED;
            }

            if (newStatus != null && newStatus != order.getCurrentStatus()) {
                OrderStatus prev = order.getCurrentStatus();
                order.setCurrentStatus(newStatus);
                orderRepository.save(order);

                OrderStatusTransition t = OrderStatusTransition.builder()
                        .orderId(order.getId())
                        .fromStatus(prev)
                        .toStatus(newStatus)
                        .reasonNote("Derived state transition from Shipment status update.")
                        .staffId(staffId)
                        .staffUsername(staffUsername != null ? staffUsername : "SYSTEM")
                        .build();
                transitionRepository.save(t);

                djangoOrderSyncService.syncOrderStatusToDjango(order.getDjangoOrderId() != null ? order.getDjangoOrderId() : order.getId(), newStatus);
            }
        } catch (Exception e) {
            log.warn("Could not derive order status for order ID {}: {}", orderId, e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public List<LogisticsTrackingResponse> getShipmentTracking(Long id) {
        return trackingEventRepository.findByShipmentIdOrderByTimestampAsc(id).stream()
                .map(e -> LogisticsTrackingResponse.builder()
                        .id(e.getId())
                        .shipmentId(e.getShipmentId())
                        .containerId(e.getContainerId())
                        .status(e.getStatus())
                        .locationName(e.getLocationName())
                        .latitude(e.getLatitude())
                        .longitude(e.getLongitude())
                        .description(e.getDescription())
                        .timestamp(e.getTimestamp())
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<ShipmentResponse> searchShipments(Long orderId, ShipmentStatus status, Long containerId, String search, Pageable pageable) {
        return shipmentRepository.searchShipments(orderId, status, containerId, search, pageable)
                .map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public com.econext.order.dto.FulfillmentSummaryResponse getFulfillmentSummary(LocalDateTime fromTime, LocalDateTime toTime) {
        // 1. Shipment Status Aggregations
        List<Object[]> shipmentCountsRaw = shipmentRepository.countShipmentsByStatus();
        Map<String, Long> shipmentStatusCounts = new LinkedHashMap<>();
        for (ShipmentStatus st : ShipmentStatus.values()) {
            shipmentStatusCounts.put(st.name(), 0L);
        }
        for (Object[] row : shipmentCountsRaw) {
            if (row[0] != null) {
                shipmentStatusCounts.put(((ShipmentStatus) row[0]).name(), ((Number) row[1]).longValue());
            }
        }

        long totalShipments = shipmentRepository.count();
        long activeShipments = shipmentRepository.countActiveShipments();
        long pendingShipments = shipmentStatusCounts.getOrDefault("CREATED", 0L) + shipmentStatusCounts.getOrDefault("PACKED", 0L);
        long inTransitShipments = shipmentStatusCounts.getOrDefault("DISPATCHED", 0L)
                + shipmentStatusCounts.getOrDefault("IN_TRANSIT", 0L)
                + shipmentStatusCounts.getOrDefault("ARRIVED_AT_HUB", 0L);
        long outForDeliveryShipments = shipmentStatusCounts.getOrDefault("OUT_FOR_DELIVERY", 0L);
        long deliveredShipments = shipmentStatusCounts.getOrDefault("DELIVERED", 0L);
        long failedDeliveryShipments = shipmentStatusCounts.getOrDefault("FAILED_DELIVERY", 0L);
        long cancelledShipments = shipmentStatusCounts.getOrDefault("CANCELLED", 0L);
        long returnedShipments = shipmentStatusCounts.getOrDefault("RETURNED", 0L);

        // 2. Container Aggregations
        List<Object[]> containerCountsRaw = containerRepository.countContainersByStatus();
        Map<String, Long> containerStatusCounts = new LinkedHashMap<>();
        for (ContainerStatus st : ContainerStatus.values()) {
            containerStatusCounts.put(st.name(), 0L);
        }
        for (Object[] row : containerCountsRaw) {
            if (row[0] != null) {
                containerStatusCounts.put(((ContainerStatus) row[0]).name(), ((Number) row[1]).longValue());
            }
        }
        long totalContainers = containerRepository.count();
        long activeContainers = containerRepository.countActiveContainers();

        // 3. Order Status Aggregations
        List<Object[]> orderCountsRaw = orderRepository.countOrdersByStatus();
        Map<String, Long> orderStatusCounts = new LinkedHashMap<>();
        for (OrderStatus st : OrderStatus.values()) {
            orderStatusCounts.put(st.name(), 0L);
        }
        for (Object[] row : orderCountsRaw) {
            if (row[0] != null) {
                orderStatusCounts.put(((OrderStatus) row[0]).name(), ((Number) row[1]).longValue());
            }
        }
        long totalOrders = orderRepository.count();

        // 4. GPS & Telemetry Tracking
        long totalTrackingEvents = trackingEventRepository.count();
        long shipmentsWithGps = shipmentRepository.countShipmentsWithGps();
        long shipmentsWithRecentGps = shipmentRepository.countShipmentsWithRecentGps(LocalDateTime.now().minusHours(24));

        // 5. Recent Active In-Transit Loads & GPS updates
        List<ShipmentResponse> inTransitList = shipmentRepository.findInTransitShipments(org.springframework.data.domain.PageRequest.of(0, 8))
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        List<ShipmentResponse> recentGpsList = shipmentRepository.findRecentGpsUpdates(org.springframework.data.domain.PageRequest.of(0, 8))
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        // 6. Recent Activity Stream
        List<LogisticsTrackingResponse> recentActivity = trackingEventRepository.findRecentEvents(org.springframework.data.domain.PageRequest.of(0, 10))
                .stream()
                .map(e -> LogisticsTrackingResponse.builder()
                        .id(e.getId())
                        .shipmentId(e.getShipmentId())
                        .containerId(e.getContainerId())
                        .status(e.getStatus())
                        .locationName(e.getLocationName())
                        .latitude(e.getLatitude())
                        .longitude(e.getLongitude())
                        .description(e.getDescription())
                        .timestamp(e.getTimestamp())
                        .build())
                .collect(Collectors.toList());

        return com.econext.order.dto.FulfillmentSummaryResponse.builder()
                .totalOrders(totalOrders)
                .totalShipments(totalShipments)
                .activeShipments(activeShipments)
                .pendingShipments(pendingShipments)
                .inTransitShipments(inTransitShipments)
                .outForDeliveryShipments(outForDeliveryShipments)
                .deliveredShipments(deliveredShipments)
                .failedDeliveryShipments(failedDeliveryShipments)
                .cancelledShipments(cancelledShipments)
                .returnedShipments(returnedShipments)
                .totalContainers(totalContainers)
                .activeContainers(activeContainers)
                .totalTrackingEvents(totalTrackingEvents)
                .shipmentsWithGps(shipmentsWithGps)
                .shipmentsWithRecentGps(shipmentsWithRecentGps)
                .shipmentStatusCounts(shipmentStatusCounts)
                .containerStatusCounts(containerStatusCounts)
                .orderStatusCounts(orderStatusCounts)
                .inTransitShipmentsList(inTransitList)
                .recentGpsUpdates(recentGpsList)
                .recentActivityStream(recentActivity)
                .build();
    }

    private ShipmentResponse mapToResponse(Shipment s) {
        List<ShipmentItemResponse> itemDtos = s.getItems() != null ? s.getItems().stream()
                .map(it -> ShipmentItemResponse.builder()
                        .id(it.getId())
                        .orderItemId(it.getOrderItemId())
                        .productId(it.getProductId())
                        .productName(it.getProductName())
                        .quantity(it.getQuantity())
                        .createdAt(it.getCreatedAt())
                        .build())
                .collect(Collectors.toList()) : Collections.emptyList();

        // Direct Shipment GPS takes precedence; fallback to Container GPS if assigned
        java.math.BigDecimal lat = s.getCurrentLatitude() != null
                ? s.getCurrentLatitude()
                : (s.getContainer() != null ? s.getContainer().getCurrentLatitude() : null);
        java.math.BigDecimal lon = s.getCurrentLongitude() != null
                ? s.getCurrentLongitude()
                : (s.getContainer() != null ? s.getContainer().getCurrentLongitude() : null);
        LocalDateTime locUpdate = s.getLastLocationUpdate() != null
                ? s.getLastLocationUpdate()
                : (s.getContainer() != null ? s.getContainer().getLastLocationUpdate() : null);

        return ShipmentResponse.builder()
                .id(s.getId())
                .shipmentNumber(s.getShipmentNumber())
                .orderId(s.getOrderId())
                .containerId(s.getContainer() != null ? s.getContainer().getId() : null)
                .containerCode(s.getContainer() != null ? s.getContainer().getContainerCode() : null)
                .status(s.getStatus())
                .carrierName(s.getCarrierName())
                .trackingNumber(s.getTrackingNumber())
                .vehicleNumber(s.getVehicleNumber())
                .origin(s.getOrigin())
                .destination(s.getDestination())
                .route(s.getRoute())
                .estimatedDelivery(s.getEstimatedDelivery())
                .currentLatitude(lat)
                .currentLongitude(lon)
                .lastLocationUpdate(locUpdate)
                .items(itemDtos)
                .createdAt(s.getCreatedAt())
                .updatedAt(s.getUpdatedAt())
                .build();
    }
}
