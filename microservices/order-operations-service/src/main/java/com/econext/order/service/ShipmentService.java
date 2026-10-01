package com.econext.order.service;

import com.econext.order.dto.*;
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
    private final ShipmentEventRepository shipmentEventRepository;
    private final OrderStatusTransitionRepository transitionRepository;
    private final DjangoOrderSyncService djangoOrderSyncService;
    private final FulfillmentEventProducer fulfillmentEventProducer;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    @org.springframework.context.annotation.Lazy
    private DeliveryOtpService deliveryOtpService;

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
        OperationalOrder order = orderRepository.findById(request.getOrderId())
                .or(() -> orderRepository.findByDjangoOrderId(request.getOrderId()))
                .orElseGet(() -> {
                    OperationalOrder fetched = djangoOrderSyncService.fetchOrderFromDjango(request.getOrderId());
                    if (fetched != null) {
                        return orderRepository.save(fetched);
                    }
                    throw new ResourceNotFoundException("Order not found with ID: " + request.getOrderId());
                });

        Container container = null;
        if (request.getContainerId() != null) {
            container = containerRepository.findById(request.getContainerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Container not found with ID: " + request.getContainerId()));
        }

        List<ShipmentItem> shipmentItems = new ArrayList<>();
        if (request.getItems() != null && !request.getItems().isEmpty()) {
            Map<Long, OperationalOrderItem> orderItemMap = order.getItems().stream()
                    .collect(Collectors.toMap(OperationalOrderItem::getId, item -> item, (a, b) -> a));

            for (CreateShipmentRequest.ShipmentItemAllocation alloc : request.getItems()) {
                OperationalOrderItem orderItem = alloc.getOrderItemId() != null ? orderItemMap.get(alloc.getOrderItemId()) : null;
                if (orderItem == null && !order.getItems().isEmpty()) {
                    orderItem = order.getItems().get(0);
                }
                if (orderItem == null) {
                    throw new BadRequestException("OrderItem with ID " + alloc.getOrderItemId() + " does not belong to Order #" + order.getId());
                }

                int allocQty = alloc.getQuantity() != null ? alloc.getQuantity() : orderItem.getQuantity();
                ShipmentItem item = ShipmentItem.builder()
                        .orderItemId(orderItem.getId())
                        .productId(orderItem.getProductId())
                        .productName(orderItem.getProductName())
                        .quantity(allocQty)
                        .build();
                shipmentItems.add(item);
            }
        } else if (order.getItems() != null && !order.getItems().isEmpty()) {
            for (OperationalOrderItem orderItem : order.getItems()) {
                int alreadyAllocated = shipmentItemRepository.sumAllocatedQuantityByOrderItemId(orderItem.getId());
                int remaining = Math.max(1, orderItem.getQuantity() - alreadyAllocated);
                ShipmentItem item = ShipmentItem.builder()
                        .orderItemId(orderItem.getId())
                        .productId(orderItem.getProductId())
                        .productName(orderItem.getProductName())
                        .quantity(remaining)
                        .build();
                shipmentItems.add(item);
            }
        }

        if (shipmentItems.isEmpty()) {
            shipmentItems.add(ShipmentItem.builder()
                    .orderItemId(order.getId())
                    .productId(1L)
                    .productName("Order Package #" + order.getId())
                    .quantity(1)
                    .build());
        }

        String shipmentNumber = "SHP-" + order.getId() + "-" + String.format("%02d", shipmentRepository.findByOrderId(order.getId()).size() + 1);
        String trackingNumber = request.getTrackingNumber() != null && !request.getTrackingNumber().isBlank()
                ? request.getTrackingNumber()
                : (order.getTrackingNumber() != null && !order.getTrackingNumber().isBlank() ? order.getTrackingNumber() : "ECO-AWB-" + (order.getId() * 100 + shipmentItems.size()));
        String carrierName = request.getCarrierName() != null && !request.getCarrierName().isBlank()
                ? request.getCarrierName()
                : (order.getCarrierName() != null ? order.getCarrierName() : "EcoExpress Carbon-Neutral");

        String origin = request.getOrigin() != null && !request.getOrigin().isBlank()
                ? request.getOrigin()
                : (container != null ? container.getOrigin() : "Bengaluru Central Fulfillment Hub");

        StringBuilder destBuilder = new StringBuilder();
        if (order.getShippingAddress() != null && !order.getShippingAddress().isBlank()) {
            destBuilder.append(order.getShippingAddress());
        }
        if (order.getCity() != null && !order.getCity().isBlank()) {
            if (destBuilder.length() > 0) destBuilder.append(", ");
            destBuilder.append(order.getCity());
        }
        if (order.getState() != null && !order.getState().isBlank()) {
            if (destBuilder.length() > 0) destBuilder.append(", ");
            destBuilder.append(order.getState());
        }
        if (order.getZipcode() != null && !order.getZipcode().isBlank()) {
            if (destBuilder.length() > 0) destBuilder.append(" - ");
            destBuilder.append(order.getZipcode());
        }
        String autoDestination = destBuilder.length() > 0 ? destBuilder.toString() : "Customer Delivery Address";

        String destination = request.getDestination() != null && !request.getDestination().isBlank()
                ? request.getDestination()
                : autoDestination;

        Shipment shipment = Shipment.builder()
                .shipmentNumber(shipmentNumber)
                .orderId(order.getId())
                .container(container)
                .status(ShipmentStatus.CREATED)
                .carrierName(carrierName)
                .trackingNumber(trackingNumber)
                .vehicleNumber(request.getVehicleNumber() != null && !request.getVehicleNumber().isBlank() ? request.getVehicleNumber() : "KA-01-EQ-9124")
                .origin(origin)
                .destination(destination)
                .route(request.getRoute() != null && !request.getRoute().isBlank() ? request.getRoute() : "National Green Expressway Corridor")
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

        String role = resolveStaffRole(staffUsername, ShipmentStatus.CREATED);

        // 1. Save ShipmentEvent in shipment_events table
        ShipmentEvent shipmentEvent = ShipmentEvent.builder()
                .shipmentId(saved.getId())
                .oldStatus(null)
                .newStatus(ShipmentStatus.CREATED.name())
                .changedBy(staffUsername != null ? staffUsername : "SYSTEM")
                .changedRole(role)
                .latitude(saved.getCurrentLatitude())
                .longitude(saved.getCurrentLongitude())
                .build();
        shipmentEventRepository.save(shipmentEvent);

        // 2. Save Tracking event for backwards compatibility
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

        // 3. Publish Kafka event to shipment.status.updated
        fulfillmentEventProducer.publishShipmentStatusUpdated(ShipmentStatusUpdatedEvent.builder()
                .shipmentId(saved.getId())
                .shipmentNumber(saved.getShipmentNumber())
                .orderId(saved.getOrderId())
                .oldStatus(null)
                .newStatus(ShipmentStatus.CREATED.name())
                .location(origin)
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

        String role = resolveStaffRole(staffUsername, targetStatus);

        // 1. Save ShipmentEvent in shipment_events table
        ShipmentEvent shipmentEvent = ShipmentEvent.builder()
                .shipmentId(updated.getId())
                .oldStatus(currentStatus.name())
                .newStatus(targetStatus.name())
                .changedBy(staffUsername != null ? staffUsername : "STAFF")
                .changedRole(role)
                .latitude(updated.getCurrentLatitude())
                .longitude(updated.getCurrentLongitude())
                .build();
        shipmentEventRepository.save(shipmentEvent);

        // 2. Save Tracking event for backwards compatibility
        LogisticsTrackingEvent event = LogisticsTrackingEvent.builder()
                .shipmentId(updated.getId())
                .containerId(updated.getContainer() != null ? updated.getContainer().getId() : null)
                .status(targetStatus.name())
                .locationName(updated.getDestination())
                .latitude(updated.getCurrentLatitude())
                .longitude(updated.getCurrentLongitude())
                .description("Shipment status updated from " + currentStatus.name() + " to " + targetStatus.name() + " by " + (staffUsername != null ? staffUsername : "STAFF"))
                .build();
        trackingEventRepository.save(event);

        // 3. Publish Kafka event to shipment.status.updated
        fulfillmentEventProducer.publishShipmentStatusUpdated(ShipmentStatusUpdatedEvent.builder()
                .shipmentId(updated.getId())
                .shipmentNumber(updated.getShipmentNumber())
                .orderId(updated.getOrderId())
                .oldStatus(currentStatus.name())
                .newStatus(targetStatus.name())
                .location(updated.getDestination())
                .carrierName(updated.getCarrierName())
                .trackingNumber(updated.getTrackingNumber())
                .timestamp(LocalDateTime.now())
                .build());

        // 4. Update derived OperationalOrder status and sync
        evaluateAndSyncOrderStatus(updated.getOrderId(), staffId, staffUsername);

        // 5. Automatically generate and dispatch secure Delivery OTP email when shipment is OUT_FOR_DELIVERY
        if (targetStatus == ShipmentStatus.OUT_FOR_DELIVERY) {
            try {
                if (deliveryOtpService != null) {
                    deliveryOtpService.generateAndSendOtp(updated.getId(), staffId, staffUsername);
                }
            } catch (Exception ex) {
                log.warn("Automatic delivery OTP generation skipped on OUT_FOR_DELIVERY transition for shipment #{}: {}", updated.getId(), ex.getMessage());
            }
        }

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
            } else if (anyDispatched && (order.getCurrentStatus() == OrderStatus.PROCESSING || order.getCurrentStatus() == OrderStatus.PACKED || order.getCurrentStatus() == OrderStatus.ORDER_CONFIRMED || order.getCurrentStatus() == OrderStatus.ORDER_PLACED)) {
                newStatus = OrderStatus.SHIPPED;
            } else if (anyPacked && (order.getCurrentStatus() == OrderStatus.PROCESSING || order.getCurrentStatus() == OrderStatus.ORDER_CONFIRMED || order.getCurrentStatus() == OrderStatus.ORDER_PLACED)) {
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
    public List<ShipmentEventResponse> getShipmentEvents(Long id) {
        return shipmentEventRepository.findByShipmentIdOrderByCreatedAtAsc(id).stream()
                .map(e -> ShipmentEventResponse.builder()
                        .id(e.getId())
                        .shipmentId(e.getShipmentId())
                        .oldStatus(e.getOldStatus())
                        .newStatus(e.getNewStatus())
                        .changedBy(e.getChangedBy())
                        .changedRole(e.getChangedRole())
                        .latitude(e.getLatitude())
                        .longitude(e.getLongitude())
                        .createdAt(e.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<ShipmentResponse> searchShipments(
            Long orderId,
            ShipmentStatus status,
            Long containerId,
            String warehouse,
            String hub,
            String state,
            String city,
            String pincode,
            String carrier,
            LocalDateTime fromTime,
            LocalDateTime toTime,
            String search,
            Pageable pageable
    ) {
        return shipmentRepository.searchShipments(
                orderId,
                status,
                containerId,
                warehouse,
                hub,
                state,
                city,
                pincode,
                carrier,
                fromTime,
                toTime,
                search,
                pageable
        ).map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public FulfillmentSummaryResponse getFulfillmentSummary(LocalDateTime fromTime, LocalDateTime toTime) {
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

        return FulfillmentSummaryResponse.builder()
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
                .shipmentStatusCounts(shipmentStatusCounts)
                .containerStatusCounts(containerStatusCounts)
                .orderStatusCounts(orderStatusCounts)
                .build();
    }

    private String resolveStaffRole(String staffUsername, ShipmentStatus targetStatus) {
        if (targetStatus == ShipmentStatus.OUT_FOR_DELIVERY || targetStatus == ShipmentStatus.DELIVERED) {
            return "Delivery Agent";
        }
        if (targetStatus == ShipmentStatus.IN_TRANSIT || targetStatus == ShipmentStatus.ARRIVED_AT_HUB) {
            return "Logistics Linehaul Staff";
        }
        if (targetStatus == ShipmentStatus.PACKED || targetStatus == ShipmentStatus.DISPATCHED) {
            return "Warehouse Staff";
        }
        if (staffUsername != null && staffUsername.toUpperCase().contains("ADMIN")) {
            return "Admin";
        }
        return "Operations Staff";
    }

    private ShipmentResponse mapToResponse(Shipment shipment) {
        List<ShipmentItemResponse> itemResponses = shipment.getItems() != null ? shipment.getItems().stream()
                .map(item -> ShipmentItemResponse.builder()
                        .id(item.getId())
                        .orderItemId(item.getOrderItemId())
                        .productId(item.getProductId())
                        .productName(item.getProductName())
                        .quantity(item.getQuantity())
                        .build())
                .collect(Collectors.toList()) : Collections.emptyList();

        List<ShipmentEventResponse> eventResponses = shipmentEventRepository != null
                ? shipmentEventRepository.findByShipmentIdOrderByCreatedAtAsc(shipment.getId()).stream()
                .map(e -> ShipmentEventResponse.builder()
                        .id(e.getId())
                        .shipmentId(e.getShipmentId())
                        .oldStatus(e.getOldStatus())
                        .newStatus(e.getNewStatus())
                        .changedBy(e.getChangedBy())
                        .changedRole(e.getChangedRole())
                        .latitude(e.getLatitude())
                        .longitude(e.getLongitude())
                        .createdAt(e.getCreatedAt())
                        .build())
                .collect(Collectors.toList())
                : Collections.emptyList();

        return ShipmentResponse.builder()
                .id(shipment.getId())
                .shipmentNumber(shipment.getShipmentNumber())
                .orderId(shipment.getOrderId())
                .containerId(shipment.getContainer() != null ? shipment.getContainer().getId() : null)
                .containerCode(shipment.getContainer() != null ? shipment.getContainer().getContainerCode() : null)
                .status(shipment.getStatus())
                .carrierName(shipment.getCarrierName())
                .trackingNumber(shipment.getTrackingNumber())
                .vehicleNumber(shipment.getVehicleNumber())
                .origin(shipment.getOrigin())
                .destination(shipment.getDestination())
                .route(shipment.getRoute())
                .estimatedDelivery(shipment.getEstimatedDelivery())
                .currentLatitude(shipment.getCurrentLatitude())
                .currentLongitude(shipment.getCurrentLongitude())
                .lastLocationUpdate(shipment.getLastLocationUpdate())
                .items(itemResponses)
                .events(eventResponses)
                .createdAt(shipment.getCreatedAt())
                .updatedAt(shipment.getUpdatedAt())
                .build();
    }
}
