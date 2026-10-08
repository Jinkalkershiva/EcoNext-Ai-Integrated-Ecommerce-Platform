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

import java.math.BigDecimal;
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
    private final DriverRepository driverRepository;
    private final OperationalOrderRepository orderRepository;
    private final LogisticsTrackingEventRepository trackingEventRepository;
    private final ShipmentEventRepository shipmentEventRepository;
    private final OrderStatusTransitionRepository transitionRepository;
    private final RouteExceptionAuditRepository routeExceptionAuditRepository;
    private final DeliveryVerificationAuditRepository deliveryVerificationAuditRepository;
    private final DjangoOrderSyncService djangoOrderSyncService;
    private final FulfillmentEventProducer fulfillmentEventProducer;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    @org.springframework.context.annotation.Lazy
    private DeliveryOtpService deliveryOtpService;

    private static final Map<ShipmentStatus, Set<ShipmentStatus>> ALLOWED_SHIPMENT_TRANSITIONS = Map.ofEntries(
            Map.entry(ShipmentStatus.OPEN, Set.of(ShipmentStatus.ASSIGNED, ShipmentStatus.FULL, ShipmentStatus.READY_FOR_DISPATCH, ShipmentStatus.CANCELLED)),
            Map.entry(ShipmentStatus.CREATED, Set.of(ShipmentStatus.ASSIGNED, ShipmentStatus.PACKED, ShipmentStatus.READY_FOR_DISPATCH, ShipmentStatus.FULL, ShipmentStatus.CANCELLED)),
            Map.entry(ShipmentStatus.ASSIGNED, Set.of(ShipmentStatus.READY_FOR_DISPATCH, ShipmentStatus.DISPATCHED, ShipmentStatus.IN_TRANSIT, ShipmentStatus.OPEN, ShipmentStatus.CANCELLED)),
            Map.entry(ShipmentStatus.FULL, Set.of(ShipmentStatus.READY_FOR_DISPATCH, ShipmentStatus.OPEN, ShipmentStatus.CANCELLED)),
            Map.entry(ShipmentStatus.READY_FOR_DISPATCH, Set.of(ShipmentStatus.IN_TRANSIT, ShipmentStatus.DISPATCHED, ShipmentStatus.OPEN, ShipmentStatus.CANCELLED)),
            Map.entry(ShipmentStatus.PACKED, Set.of(ShipmentStatus.READY_FOR_DISPATCH, ShipmentStatus.DISPATCHED, ShipmentStatus.IN_TRANSIT, ShipmentStatus.CANCELLED)),
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
        // Collect all target order IDs
        Set<Long> targetOrderIds = new LinkedHashSet<>();
        if (request.getOrderId() != null) {
            targetOrderIds.add(request.getOrderId());
        }
        if (request.getOrderIds() != null) {
            targetOrderIds.addAll(request.getOrderIds());
        }
        if (request.getOrderRefNumbers() != null) {
            for (String ref : request.getOrderRefNumbers()) {
                if (ref != null && !ref.isBlank()) {
                    String clean = ref.replace("ORD-", "").trim();
                    try {
                        targetOrderIds.add(Long.parseLong(clean));
                    } catch (NumberFormatException ignored) {}
                }
            }
        }

        List<OperationalOrder> targetOrders = new ArrayList<>();
        for (Long oId : targetOrderIds) {
            OperationalOrder order = orderRepository.findByDjangoOrderId(oId)
                    .orElseGet(() -> {
                        OperationalOrder fetched = djangoOrderSyncService.fetchOrderFromDjango(oId);
                        if (fetched != null) {
                            return orderRepository.save(fetched);
                        }
                        return orderRepository.findById(oId).orElse(null);
                    });
            if (order == null) {
                throw new ResourceNotFoundException("Order not found with ID: " + oId);
            }
            if (order.getShipment() != null) {
                throw new BadRequestException("Order #" + order.getOrderReferenceNumber() + " is already assigned to active Shipment #" + order.getShipment().getShipmentNumber());
            }
            if (order.getCurrentStatus() == OrderStatus.CANCELLED || order.getCurrentStatus() == OrderStatus.DELIVERED) {
                throw new BadRequestException("Order #" + order.getOrderReferenceNumber() + " is " + order.getCurrentStatus() + " and cannot be shipped.");
            }
            targetOrders.add(order);
        }

        if (targetOrders.isEmpty()) {
            throw new BadRequestException("Cannot create shipment without at least one eligible order.");
        }

        Container container = null;
        if (request.getContainerId() != null) {
            container = containerRepository.findById(request.getContainerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Container not found with ID: " + request.getContainerId()));
        }

        BigDecimal maxWeight = new BigDecimal("10000.00");
        BigDecimal maxVolume = new BigDecimal("35.00");
        BigDecimal totalWeight = BigDecimal.ZERO;
        BigDecimal totalVolume = BigDecimal.ZERO;

        for (OperationalOrder o : targetOrders) {
            totalWeight = totalWeight.add(o.resolveWeight());
            totalVolume = totalVolume.add(o.resolveVolume());
        }

        if (totalWeight.compareTo(maxWeight) > 0) {
            throw new BadRequestException("Capacity Exceeded: Total orders weight (" + totalWeight + " kg) exceeds max shipment capacity (" + maxWeight + " kg).");
        }
        if (totalVolume.compareTo(maxVolume) > 0) {
            throw new BadRequestException("Capacity Exceeded: Total orders volume (" + totalVolume + " m3) exceeds max shipment capacity (" + maxVolume + " m3).");
        }

        String origin = request.getOrigin() != null && !request.getOrigin().isBlank()
                ? request.getOrigin()
                : (container != null ? container.getOrigin() : "Gujarat Central Hub");

        String destination = request.getDestination() != null && !request.getDestination().isBlank()
                ? request.getDestination()
                : (!targetOrders.isEmpty() && targetOrders.get(0).getCity() != null ? targetOrders.get(0).getCity() + ", " + (targetOrders.get(0).getState() != null ? targetOrders.get(0).getState() : "") : "Bengaluru Hub");

        String route = request.getRoute() != null && !request.getRoute().isBlank()
                ? request.getRoute()
                : "Gujarat Warehouse -> Maharashtra Hub -> Telangana Hub -> " + destination;

        String combinedRoute = (origin + " " + route + " " + destination).toLowerCase();

        boolean anyRouteMismatch = false;
        List<String> mismatchDetails = new ArrayList<>();
        for (OperationalOrder o : targetOrders) {
            String city = o.getCity() != null ? o.getCity().trim().toLowerCase() : "";
            String state = o.getState() != null ? o.getState().trim().toLowerCase() : "";
            boolean matches = (city.isEmpty() && state.isEmpty())
                    || (!city.isEmpty() && combinedRoute.contains(city))
                    || (!state.isEmpty() && combinedRoute.contains(state));
            if (!matches) {
                anyRouteMismatch = true;
                mismatchDetails.add(o.getOrderReferenceNumber() + " (" + o.getCity() + ", " + o.getState() + ")");
            }
        }

        if (anyRouteMismatch) {
            if (request.getRouteException() == null || !request.getRouteException()) {
                throw new BadRequestException("ROUTE_MISMATCH: Selected order destinations " + mismatchDetails + " are outside shipment planned corridor (" + route + "). Route exception authorization required.");
            }
            if (request.getExceptionReason() == null || request.getExceptionReason().trim().isEmpty()) {
                throw new BadRequestException("Route exception reason is required when assigning off-corridor orders.");
            }
        }

        long count = shipmentRepository.count() + 1;
        String shipmentNumber = "SHP-" + (1000 + count);
        String trackingNumber = request.getTrackingNumber() != null && !request.getTrackingNumber().isBlank()
                ? request.getTrackingNumber()
                : ("ECO-AWB-" + System.currentTimeMillis() % 1000000);
        String carrierName = request.getCarrierName() != null && !request.getCarrierName().isBlank()
                ? request.getCarrierName()
                : (!targetOrders.isEmpty() && targetOrders.get(0).getCarrierName() != null ? targetOrders.get(0).getCarrierName() : "EcoExpress Carbon-Neutral Fleet");

        String warehouse = request.getWarehouse() != null && !request.getWarehouse().isBlank()
                ? request.getWarehouse().trim()
                : (container != null && container.getWarehouse() != null ? container.getWarehouse() : origin);

        Shipment shipment = Shipment.builder()
                .shipmentNumber(shipmentNumber)
                .orderId(!targetOrders.isEmpty() ? targetOrders.get(0).getId() : null)
                .container(container)
                .status(ShipmentStatus.OPEN)
                .carrierName(carrierName)
                .trackingNumber(trackingNumber)
                .warehouse(warehouse)
                .vehicleNumber(request.getVehicleNumber() != null && !request.getVehicleNumber().isBlank() ? request.getVehicleNumber() : "KA-01-EQ-9124 (EV Heavy Truck)")
                .origin(origin)
                .destination(destination)
                .route(route)
                .maxWeight(maxWeight)
                .maxVolume(maxVolume)
                .usedWeight(totalWeight)
                .usedVolume(totalVolume)
                .currentLatitude(request.getCurrentLatitude())
                .currentLongitude(request.getCurrentLongitude())
                .lastLocationUpdate(request.getCurrentLatitude() != null ? LocalDateTime.now() : null)
                .estimatedDelivery(request.getEstimatedDelivery() != null ? request.getEstimatedDelivery() : LocalDateTime.now().plusDays(4))
                .build();

        List<ShipmentItem> allShipmentItems = new ArrayList<>();
        if (targetOrders.size() == 1 && request.getItems() != null && !request.getItems().isEmpty()) {
            OperationalOrder singleOrder = targetOrders.get(0);
            Map<Long, OperationalOrderItem> orderItemMap = singleOrder.getItems().stream()
                    .collect(Collectors.toMap(OperationalOrderItem::getId, item -> item, (a, b) -> a));

            for (CreateShipmentRequest.ShipmentItemAllocation alloc : request.getItems()) {
                OperationalOrderItem orderItem = alloc.getOrderItemId() != null ? orderItemMap.get(alloc.getOrderItemId()) : null;
                if (orderItem == null && !singleOrder.getItems().isEmpty()) {
                    orderItem = singleOrder.getItems().get(0);
                }
                if (orderItem != null) {
                    int allocQty = alloc.getQuantity() != null ? alloc.getQuantity() : orderItem.getQuantity();
                    allShipmentItems.add(ShipmentItem.builder()
                            .shipment(shipment)
                            .orderItemId(orderItem.getId())
                            .productId(orderItem.getProductId())
                            .productName(orderItem.getProductName())
                            .quantity(allocQty)
                            .build());
                }
            }
        } else {
            for (OperationalOrder o : targetOrders) {
                if (o.getItems() != null && !o.getItems().isEmpty()) {
                    for (OperationalOrderItem it : o.getItems()) {
                        int alreadyAllocated = shipmentItemRepository.sumAllocatedQuantityByOrderItemId(it.getId());
                        int remaining = Math.max(1, (it.getQuantity() != null ? it.getQuantity() : 1) - alreadyAllocated);
                        allShipmentItems.add(ShipmentItem.builder()
                                .shipment(shipment)
                                .orderItemId(it.getId())
                                .productId(it.getProductId())
                                .productName(it.getProductName())
                                .quantity(remaining)
                                .build());
                    }
                }
            }
        }
        shipment.setItems(allShipmentItems);
        shipment.setAssignedOrders(new ArrayList<>(targetOrders));

        Shipment saved = shipmentRepository.save(shipment);

        // Associate each order with the saved shipment
        for (OperationalOrder o : targetOrders) {
            o.setShipment(saved);
            OrderStatus prevStatus = o.getCurrentStatus();
            o.setCurrentStatus(OrderStatus.ASSIGNED_TO_SHIPMENT);
            if (o.getCarrierName() == null || o.getCarrierName().isBlank()) o.setCarrierName(carrierName);
            if (o.getTrackingNumber() == null || o.getTrackingNumber().isBlank()) o.setTrackingNumber(trackingNumber);
            orderRepository.save(o);

            OrderStatusTransition transition = OrderStatusTransition.builder()
                    .orderId(o.getId())
                    .fromStatus(prevStatus)
                    .toStatus(OrderStatus.ASSIGNED_TO_SHIPMENT)
                    .reasonNote("Assigned to Shipment #" + saved.getShipmentNumber() + " (Weight: " + o.resolveWeight() + "kg, Volume: " + o.resolveVolume() + "m3)")
                    .staffId(staffId)
                    .staffUsername(staffUsername != null ? staffUsername : "SYSTEM")
                    .build();
            transitionRepository.save(transition);

            djangoOrderSyncService.syncOrderStatusToDjango(
                    o.getDjangoOrderId() != null ? o.getDjangoOrderId() : o.getId(),
                    OrderStatus.ASSIGNED_TO_SHIPMENT,
                    saved.getShipmentNumber(),
                    saved.getTrackingNumber(),
                    saved.getCarrierName(),
                    null
            );
        }

        // If route exception was logged
        if (anyRouteMismatch && Boolean.TRUE.equals(request.getRouteException())) {
            for (OperationalOrder o : targetOrders) {
                RouteExceptionAudit audit = RouteExceptionAudit.builder()
                        .shipmentId(saved.getId())
                        .orderId(o.getId())
                        .actorUsername(staffUsername != null ? staffUsername : "STAFF")
                        .actorRole(resolveStaffRole(staffUsername, ShipmentStatus.OPEN))
                        .expectedRoute(route)
                        .actualShipmentRoute(o.getCity() + ", " + o.getState())
                        .exceptionReason(request.getExceptionReason())
                        .timestamp(LocalDateTime.now())
                        .build();
                routeExceptionAuditRepository.save(audit);
            }
        }

        String role = resolveStaffRole(staffUsername, ShipmentStatus.OPEN);

        // Save ShipmentEvent
        ShipmentEvent shipmentEvent = ShipmentEvent.builder()
                .shipmentId(saved.getId())
                .oldStatus(null)
                .newStatus(ShipmentStatus.OPEN.name())
                .changedBy(staffUsername != null ? staffUsername : "SYSTEM")
                .changedRole(role)
                .latitude(saved.getCurrentLatitude())
                .longitude(saved.getCurrentLongitude())
                .build();
        shipmentEventRepository.save(shipmentEvent);

        // Save Tracking event
        LogisticsTrackingEvent tracking = LogisticsTrackingEvent.builder()
                .shipmentId(saved.getId())
                .containerId(container != null ? container.getId() : null)
                .status(ShipmentStatus.OPEN.name())
                .locationName(origin)
                .latitude(saved.getCurrentLatitude())
                .longitude(saved.getCurrentLongitude())
                .description("Shipment initialized with " + targetOrders.size() + " orders (Load: " + totalWeight + "kg / " + totalVolume + "m3) by " + (staffUsername != null ? staffUsername : "SYSTEM"))
                .build();
        trackingEventRepository.save(tracking);

        // Publish Kafka event with all order IDs
        List<Long> orderIdList = targetOrders.stream().map(OperationalOrder::getId).collect(Collectors.toList());
        fulfillmentEventProducer.publishShipmentStatusUpdated(ShipmentStatusUpdatedEvent.builder()
                .shipmentId(saved.getId())
                .shipmentNumber(saved.getShipmentNumber())
                .orderId(saved.getOrderId())
                .orderIds(orderIdList)
                .oldStatus(null)
                .newStatus(ShipmentStatus.OPEN.name())
                .location(origin)
                .carrierName(saved.getCarrierName())
                .trackingNumber(saved.getTrackingNumber())
                .timestamp(LocalDateTime.now())
                .build());

        return mapToResponse(shipmentRepository.findById(saved.getId()).orElse(saved));
    }

    @Transactional
    public ShipmentResponse assignOrderToShipment(Long shipmentId, AssignOrderRequest request, Long staffId, String staffUsername) {
        Shipment shipment = shipmentRepository.findById(shipmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment not found with ID: " + shipmentId));

        if (!shipment.canAcceptOrders()) {
            throw new BadRequestException("Shipment #" + shipment.getShipmentNumber() + " is in status " + shipment.getStatus() + " and cannot accept new orders.");
        }

        OperationalOrder order = orderRepository.findByDjangoOrderId(request.getOrderId())
                .orElseGet(() -> {
                    OperationalOrder fetched = djangoOrderSyncService.fetchOrderFromDjango(request.getOrderId());
                    if (fetched != null) {
                        return orderRepository.save(fetched);
                    }
                    return orderRepository.findById(request.getOrderId()).orElse(null);
                });

        if (order == null) {
            throw new ResourceNotFoundException("Order not found with ID: " + request.getOrderId());
        }

        if (order.getShipment() != null && order.getShipment().getId().equals(shipmentId)) {
            return mapToResponse(shipment);
        }

        if (order.getShipment() != null && !order.getShipment().getId().equals(shipmentId)) {
            throw new BadRequestException("Order #" + order.getId() + " is already assigned to active Shipment #" + order.getShipment().getShipmentNumber());
        }

        BigDecimal orderWeight = order.resolveWeight();
        BigDecimal orderVolume = order.resolveVolume();

        // 1. Capacity Validation
        if (shipment.getRemainingWeight().compareTo(orderWeight) < 0) {
            throw new BadRequestException("Capacity Exceeded: Order weight (" + orderWeight + " kg) exceeds remaining shipment capacity (" + shipment.getRemainingWeight() + " kg).");
        }
        if (shipment.getRemainingVolume().compareTo(orderVolume) < 0) {
            throw new BadRequestException("Capacity Exceeded: Order volume (" + orderVolume + " m3) exceeds remaining shipment capacity (" + shipment.getRemainingVolume() + " m3).");
        }
        if (shipment.getContainer() != null) {
            Container c = shipment.getContainer();
            if (c.getRemainingWeightKg().compareTo(orderWeight) < 0) {
                throw new BadRequestException("Truck capacity exceeded: Order weight (" + orderWeight + " kg) exceeds truck remaining capacity (" + c.getRemainingWeightKg() + " kg).");
            }
            if (c.getRemainingVolumeM3().compareTo(orderVolume) < 0) {
                throw new BadRequestException("Truck capacity exceeded: Order volume (" + orderVolume + " m3) exceeds truck remaining volume (" + c.getRemainingVolumeM3() + " m3).");
            }
        }

        // 2. Route Compatibility Validation
        String shipmentRoute = shipment.getRoute() != null ? shipment.getRoute() : "";
        String shipmentDest = shipment.getDestination() != null ? shipment.getDestination() : "";
        String shipmentOrigin = shipment.getOrigin() != null ? shipment.getOrigin() : "";
        String combinedRoute = (shipmentOrigin + " " + shipmentRoute + " " + shipmentDest).toLowerCase();

        String orderCity = order.getCity() != null ? order.getCity().trim() : "";
        String orderState = order.getState() != null ? order.getState().trim() : "";

        boolean routeMatch = false;
        if (orderCity.isEmpty() && orderState.isEmpty()) {
            routeMatch = true;
        } else if (!orderCity.isEmpty() && combinedRoute.contains(orderCity.toLowerCase())) {
            routeMatch = true;
        } else if (!orderState.isEmpty() && combinedRoute.contains(orderState.toLowerCase())) {
            routeMatch = true;
        }

        if (!routeMatch) {
            if (request.getRouteException() == null || !request.getRouteException()) {
                throw new BadRequestException("ROUTE_MISMATCH: Order destination (" + (orderCity.isEmpty() ? "Unknown" : orderCity) + ", " + orderState + ") is outside shipment planned route (" + shipmentRoute + "). Authorized exception reason required.");
            }
            if (request.getExceptionReason() == null || request.getExceptionReason().trim().isEmpty()) {
                throw new BadRequestException("Route exception reason is required when assigning off-route orders.");
            }

            // Record RouteExceptionAudit
            RouteExceptionAudit audit = RouteExceptionAudit.builder()
                    .shipmentId(shipment.getId())
                    .orderId(order.getId())
                    .actorUsername(staffUsername != null ? staffUsername : "STAFF")
                    .actorRole(resolveStaffRole(staffUsername, shipment.getStatus()))
                    .expectedRoute(shipment.getRoute())
                    .actualShipmentRoute((orderCity.isEmpty() ? "" : orderCity + ", ") + orderState)
                    .exceptionReason(request.getExceptionReason())
                    .timestamp(LocalDateTime.now())
                    .build();
            routeExceptionAuditRepository.save(audit);
            log.warn("Route exception logged for Order #{} onto Shipment #{}. Reason: {}", order.getId(), shipment.getShipmentNumber(), request.getExceptionReason());
        }

        // 3. Update Shipment load and assign order
        shipment.setUsedWeight(shipment.getUsedWeight().add(orderWeight));
        shipment.setUsedVolume(shipment.getUsedVolume().add(orderVolume));
        order.setShipment(shipment);
        if (shipment.getAssignedOrders() == null) {
            shipment.setAssignedOrders(new ArrayList<>());
        }
        if (!shipment.getAssignedOrders().contains(order)) {
            shipment.getAssignedOrders().add(order);
        }

        if (order.getItems() != null && !order.getItems().isEmpty()) {
            if (shipment.getItems() == null) {
                shipment.setItems(new ArrayList<>());
            }
            for (OperationalOrderItem it : order.getItems()) {
                shipment.getItems().add(ShipmentItem.builder()
                        .shipment(shipment)
                        .orderItemId(it.getId())
                        .productId(it.getProductId())
                        .productName(it.getProductName())
                        .quantity(it.getQuantity() != null ? it.getQuantity() : 1)
                        .build());
            }
        }

        if (shipment.getContainer() != null) {
            Container c = shipment.getContainer();
            c.setUsedWeightKg(c.getUsedWeightKg().add(orderWeight));
            c.setUsedVolumeM3(c.getUsedVolumeM3().add(orderVolume));
            containerRepository.save(c);
        }

        OrderStatus prevStatus = order.getCurrentStatus();
        order.setCurrentStatus(OrderStatus.ASSIGNED_TO_SHIPMENT);
        orderRepository.save(order);
        Shipment updated = shipmentRepository.save(shipment);

        OrderStatusTransition t = OrderStatusTransition.builder()
                .orderId(order.getId())
                .fromStatus(prevStatus)
                .toStatus(OrderStatus.ASSIGNED_TO_SHIPMENT)
                .reasonNote("Assigned to Shipment #" + shipment.getShipmentNumber() + " (Weight: " + orderWeight + "kg, Volume: " + orderVolume + "m3)")
                .staffId(staffId)
                .staffUsername(staffUsername != null ? staffUsername : "SYSTEM")
                .build();
        transitionRepository.save(t);

        djangoOrderSyncService.syncOrderStatusToDjango(
                order.getDjangoOrderId() != null ? order.getDjangoOrderId() : order.getId(),
                OrderStatus.ASSIGNED_TO_SHIPMENT,
                shipment.getShipmentNumber(),
                shipment.getTrackingNumber(),
                shipment.getCarrierName(),
                null
        );

        return mapToResponse(updated);
    }

    @Transactional
    public ShipmentResponse removeOrderFromShipment(Long shipmentId, Long orderId, Long staffId, String staffUsername) {
        Shipment shipment = shipmentRepository.findById(shipmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment not found with ID: " + shipmentId));

        OperationalOrder order = orderRepository.findByDjangoOrderId(orderId)
                .or(() -> orderRepository.findById(orderId))
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + orderId));

        if (order.getShipment() == null || !order.getShipment().getId().equals(shipmentId)) {
            throw new BadRequestException("Order #" + orderId + " is not assigned to Shipment #" + shipment.getShipmentNumber());
        }

        BigDecimal orderWeight = order.resolveWeight();
        BigDecimal orderVolume = order.resolveVolume();

        shipment.setUsedWeight(shipment.getUsedWeight().subtract(orderWeight).max(BigDecimal.ZERO));
        shipment.setUsedVolume(shipment.getUsedVolume().subtract(orderVolume).max(BigDecimal.ZERO));
        order.setShipment(null);
        if (shipment.getAssignedOrders() != null) {
            shipment.getAssignedOrders().removeIf(o -> o.getId().equals(orderId));
        }

        OrderStatus prevStatus = order.getCurrentStatus();
        order.setCurrentStatus(OrderStatus.READY_FOR_SHIPMENT);
        orderRepository.save(order);
        Shipment updated = shipmentRepository.save(shipment);

        OrderStatusTransition t = OrderStatusTransition.builder()
                .orderId(order.getId())
                .fromStatus(prevStatus)
                .toStatus(OrderStatus.READY_FOR_SHIPMENT)
                .reasonNote("Removed from Shipment #" + shipment.getShipmentNumber())
                .staffId(staffId)
                .staffUsername(staffUsername != null ? staffUsername : "SYSTEM")
                .build();
        transitionRepository.save(t);

        djangoOrderSyncService.syncOrderStatusToDjango(order.getDjangoOrderId() != null ? order.getDjangoOrderId() : order.getId(), OrderStatus.READY_FOR_SHIPMENT);

        return mapToResponse(updated);
    }

    @Transactional
    public ShipmentResponse markShipmentFull(Long shipmentId, Long staffId, String staffUsername) {
        Shipment shipment = shipmentRepository.findById(shipmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment not found with ID: " + shipmentId));

        ShipmentStatus current = shipment.getStatus();
        if (current != ShipmentStatus.OPEN && current != ShipmentStatus.CREATED) {
            throw new BadRequestException("Shipment #" + shipment.getShipmentNumber() + " is in status " + current + " and cannot be marked full.");
        }

        shipment.setStatus(ShipmentStatus.READY_FOR_DISPATCH);
        Shipment updated = shipmentRepository.save(shipment);

        String role = resolveStaffRole(staffUsername, ShipmentStatus.READY_FOR_DISPATCH);

        ShipmentEvent event = ShipmentEvent.builder()
                .shipmentId(updated.getId())
                .oldStatus(current.name())
                .newStatus(ShipmentStatus.READY_FOR_DISPATCH.name())
                .changedBy(staffUsername != null ? staffUsername : "STAFF")
                .changedRole(role)
                .build();
        shipmentEventRepository.save(event);

        LogisticsTrackingEvent tracking = LogisticsTrackingEvent.builder()
                .shipmentId(updated.getId())
                .status(ShipmentStatus.READY_FOR_DISPATCH.name())
                .locationName(updated.getOrigin())
                .description("Shipment marked FULL & READY_FOR_DISPATCH (Orders: " + (updated.getAssignedOrders() != null ? updated.getAssignedOrders().size() : 0) + ") by " + staffUsername)
                .build();
        trackingEventRepository.save(tracking);

        return mapToResponse(updated);
    }

    @Transactional
    public ShipmentResponse dispatchShipment(Long shipmentId, Long staffId, String staffUsername) {
        Shipment shipment = shipmentRepository.findById(shipmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment not found with ID: " + shipmentId));

        ShipmentStatus current = shipment.getStatus();
        shipment.setStatus(ShipmentStatus.IN_TRANSIT);
        shipment.setDispatchedAt(LocalDateTime.now());
        Shipment updated = shipmentRepository.save(shipment);

        // Advance all assigned orders to IN_TRANSIT
        List<OperationalOrder> ordersToAdvance = (shipment.getAssignedOrders() != null && !shipment.getAssignedOrders().isEmpty())
                ? shipment.getAssignedOrders()
                : orderRepository.findByShipmentId(shipment.getId());
        for (OperationalOrder order : ordersToAdvance) {
                if (order.getCurrentStatus() != OrderStatus.DELIVERED && order.getCurrentStatus() != OrderStatus.CANCELLED) {
                    OrderStatus prev = order.getCurrentStatus();
                    order.setCurrentStatus(OrderStatus.IN_TRANSIT);
                    orderRepository.save(order);

                    OrderStatusTransition t = OrderStatusTransition.builder()
                            .orderId(order.getId())
                            .fromStatus(prev)
                            .toStatus(OrderStatus.IN_TRANSIT)
                            .reasonNote("Shipment #" + shipment.getShipmentNumber() + " dispatched into transit.")
                            .staffId(staffId)
                            .staffUsername(staffUsername != null ? staffUsername : "SYSTEM")
                            .build();
                    transitionRepository.save(t);
                    djangoOrderSyncService.syncOrderStatusToDjango(order.getDjangoOrderId() != null ? order.getDjangoOrderId() : order.getId(), OrderStatus.IN_TRANSIT);
                }
            }

        String role = resolveStaffRole(staffUsername, ShipmentStatus.IN_TRANSIT);

        ShipmentEvent event = ShipmentEvent.builder()
                .shipmentId(updated.getId())
                .oldStatus(current.name())
                .newStatus(ShipmentStatus.IN_TRANSIT.name())
                .changedBy(staffUsername != null ? staffUsername : "STAFF")
                .changedRole(role)
                .build();
        shipmentEventRepository.save(event);

        LogisticsTrackingEvent tracking = LogisticsTrackingEvent.builder()
                .shipmentId(updated.getId())
                .status(ShipmentStatus.IN_TRANSIT.name())
                .locationName(updated.getOrigin())
                .description("Shipment departed from origin hub onto route: " + updated.getRoute())
                .build();
        List<OperationalOrder> assignedOrders = (updated.getAssignedOrders() != null && !updated.getAssignedOrders().isEmpty())
                ? updated.getAssignedOrders()
                : orderRepository.findByShipmentId(updated.getId());
        List<Long> orderIds = assignedOrders.stream().map(OperationalOrder::getId).collect(Collectors.toList());

        fulfillmentEventProducer.publishShipmentStatusUpdated(ShipmentStatusUpdatedEvent.builder()
                .shipmentId(updated.getId())
                .shipmentNumber(updated.getShipmentNumber())
                .orderId(updated.getOrderId())
                .orderIds(orderIds)
                .oldStatus(current.name())
                .newStatus(ShipmentStatus.IN_TRANSIT.name())
                .location(updated.getOrigin())
                .carrierName(updated.getCarrierName())
                .trackingNumber(updated.getTrackingNumber())
                .timestamp(LocalDateTime.now())
                .build());

        if (updated.getDriverId() != null) {
            driverRepository.findById(updated.getDriverId()).ifPresent(d -> {
                d.setStatus(DriverStatus.ON_ROUTE);
                driverRepository.save(d);
            });
        }
        if (updated.getContainer() != null) {
            Container c = updated.getContainer();
            c.setStatus(ContainerStatus.IN_TRANSIT);
            containerRepository.save(c);
        }

        return mapToResponse(updated);
    }

    @Transactional(readOnly = true)
    public List<ShipmentResponse> findCompatibleShipments(List<Long> orderIds, String warehouse, String destination) {
        BigDecimal totalOrderWeight = BigDecimal.ZERO;
        BigDecimal totalOrderVolume = BigDecimal.ZERO;
        List<OperationalOrder> orders = new ArrayList<>();

        if (orderIds != null && !orderIds.isEmpty()) {
            for (Long oId : orderIds) {
                OperationalOrder o = orderRepository.findByDjangoOrderId(oId)
                        .orElseGet(() -> {
                            OperationalOrder fetched = djangoOrderSyncService.fetchOrderFromDjango(oId);
                            if (fetched != null) {
                                return orderRepository.save(fetched);
                            }
                            return orderRepository.findById(oId).orElse(null);
                        });
                if (o != null) {
                    orders.add(o);
                    totalOrderWeight = totalOrderWeight.add(o.resolveWeight());
                    totalOrderVolume = totalOrderVolume.add(o.resolveVolume());
                }
            }
        }

        String targetDest = destination != null && !destination.isBlank()
                ? destination.trim().toLowerCase()
                : (!orders.isEmpty() && orders.get(0).getCity() != null ? orders.get(0).getCity().trim().toLowerCase() : "");

        String targetWarehouse = warehouse != null && !warehouse.isBlank() && !"All Warehouses".equalsIgnoreCase(warehouse)
                ? warehouse.trim().toLowerCase()
                : "";

        List<Shipment> allOpenShipments = shipmentRepository.findAll().stream()
                .filter(Shipment::canAcceptOrders)
                .collect(Collectors.toList());

        List<ShipmentResponse> results = new ArrayList<>();
        for (Shipment s : allOpenShipments) {
            String sOrigin = (s.getWarehouse() != null ? s.getWarehouse() : (s.getOrigin() != null ? s.getOrigin() : "")).toLowerCase();
            String sDest = (s.getDestination() != null ? s.getDestination() : "").toLowerCase();
            String sRoute = (s.getRoute() != null ? s.getRoute() : "").toLowerCase();
            String fullCorridor = sOrigin + " " + sRoute + " " + sDest;

            // 1. Warehouse Match
            boolean warehouseMatch = targetWarehouse.isEmpty() || sOrigin.contains(targetWarehouse) || targetWarehouse.contains(sOrigin);

            // 2. Destination / Corridor Match
            boolean destMatch = targetDest.isEmpty() || fullCorridor.contains(targetDest) || targetDest.contains(sDest);

            // 3. Capacity Check
            boolean capacityMatch = s.getRemainingWeight().compareTo(totalOrderWeight) >= 0
                    && s.getRemainingVolume().compareTo(totalOrderVolume) >= 0;

            if (warehouseMatch && destMatch) {
                ShipmentResponse resp = mapToResponse(s);
                resp.setIsCompatible(capacityMatch);
                if (!capacityMatch) {
                    resp.setCompatibilityReason("Insufficient capacity (Required: " + totalOrderWeight + " kg, Remaining: " + s.getRemainingWeight() + " kg)");
                } else {
                    resp.setCompatibilityReason("Compatible: Origin corridor and capacity match");
                }
                results.add(resp);
            }
        }

        return results;
    }

    @Transactional
    public ShipmentResponse batchAssignOrdersToShipment(Long shipmentId, BatchAssignOrdersRequest request, Long staffId, String staffUsername) {
        Shipment shipment = shipmentRepository.findById(shipmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment not found with ID: " + shipmentId));

        if (!shipment.canAcceptOrders()) {
            throw new BadRequestException("Shipment #" + shipment.getShipmentNumber() + " is in status " + shipment.getStatus() + " and cannot accept new orders.");
        }

        for (Long oId : request.getOrderIds()) {
            AssignOrderRequest singleReq = AssignOrderRequest.builder()
                    .orderId(oId)
                    .routeException(request.getRouteException())
                    .exceptionReason(request.getExceptionReason())
                    .build();
            assignOrderToShipment(shipmentId, singleReq, staffId, staffUsername);
        }

        return mapToResponse(shipmentRepository.findById(shipmentId).orElse(shipment));
    }

    @Transactional
    public ShipmentResponse assignDriverAndTruck(Long shipmentId, AssignDriverTruckRequest request, Long staffId, String staffUsername) {
        Shipment shipment = shipmentRepository.findById(shipmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment not found with ID: " + shipmentId));

        if (shipment.getStatus() == ShipmentStatus.DISPATCHED || shipment.getStatus() == ShipmentStatus.IN_TRANSIT || shipment.getStatus() == ShipmentStatus.DELIVERED || shipment.getStatus() == ShipmentStatus.CANCELLED) {
            throw new BadRequestException("Shipment #" + shipment.getShipmentNumber() + " is already " + shipment.getStatus() + " and cannot be reassigned.");
        }

        Driver driver = null;
        if (request.getDriverId() != null) {
            driver = driverRepository.findById(request.getDriverId())
                    .orElseThrow(() -> new ResourceNotFoundException("Driver not found with ID: " + request.getDriverId()));
        } else if (request.getDriverCode() != null && !request.getDriverCode().isBlank()) {
            driver = driverRepository.findByDriverCode(request.getDriverCode().trim())
                    .orElseThrow(() -> new ResourceNotFoundException("Driver not found with code: " + request.getDriverCode()));
        }

        if (driver != null) {
            if (driver.getStatus() != DriverStatus.AVAILABLE && (driver.getAssignedShipmentId() == null || !driver.getAssignedShipmentId().equals(shipment.getId()))) {
                throw new BadRequestException("Driver [" + driver.getName() + " (" + driver.getDriverCode() + ")] is currently " + driver.getStatus() + " and cannot be assigned to another active shipment.");
            }

            // Enforce Warehouse Driver Isolation
            String shipmentWh = shipment.getWarehouse() != null && !shipment.getWarehouse().isBlank()
                    ? shipment.getWarehouse().trim().toLowerCase()
                    : (shipment.getOrigin() != null ? shipment.getOrigin().trim().toLowerCase() : "");
            String driverWh = driver.getWarehouse() != null ? driver.getWarehouse().trim().toLowerCase() : "";

            if (!shipmentWh.isEmpty() && !driverWh.isEmpty()) {
                boolean matches = shipmentWh.contains(driverWh) || driverWh.contains(shipmentWh);
                if (!matches) {
                    throw new BadRequestException("Unauthorized Fleet Operation: Driver [" + driver.getName() + " (" + driver.getDriverCode() + ")] is assigned to " + driver.getWarehouse() + " and cannot operate shipments originating from " + (shipment.getWarehouse() != null ? shipment.getWarehouse() : shipment.getOrigin()) + ".");
                }
            }

            shipment.setDriverId(driver.getId());
            shipment.setDriverCode(driver.getDriverCode());
            shipment.setDriverName(driver.getName());
            shipment.setDriverPhone(driver.getPhone());
            driver.setStatus(DriverStatus.ASSIGNED);
            driver.setAssignedShipmentId(shipment.getId());
            driverRepository.save(driver);
        }

        Container container = null;
        if (request.getContainerId() != null) {
            container = containerRepository.findById(request.getContainerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Container not found with ID: " + request.getContainerId()));
        }

        if (container != null) {
            if (!container.canAcceptShipments()) {
                throw new BadRequestException("Truck/Container [" + container.getContainerCode() + "] is in status " + container.getStatus() + " and cannot accept shipments.");
            }

            // Enforce Warehouse Container Isolation
            String shipmentWh = shipment.getWarehouse() != null && !shipment.getWarehouse().isBlank()
                    ? shipment.getWarehouse().trim().toLowerCase()
                    : (shipment.getOrigin() != null ? shipment.getOrigin().trim().toLowerCase() : "");
            String containerWh = container.getOrigin() != null ? container.getOrigin().trim().toLowerCase() : "";

            if (!shipmentWh.isEmpty() && !containerWh.isEmpty()) {
                boolean matches = shipmentWh.contains(containerWh) || containerWh.contains(shipmentWh);
                if (!matches) {
                    throw new BadRequestException("Unauthorized Fleet Operation: Truck/Container [" + container.getContainerCode() + "] belongs to " + container.getOrigin() + " and cannot operate shipments in " + (shipment.getWarehouse() != null ? shipment.getWarehouse() : shipment.getOrigin()) + ".");
                }
            }

            if (container.getRemainingWeightKg().compareTo(shipment.getUsedWeight()) < 0) {
                throw new BadRequestException("Truck capacity exceeded: Shipment load (" + shipment.getUsedWeight() + " kg) exceeds truck remaining capacity (" + container.getRemainingWeightKg() + " kg).");
            }
            if (container.getRemainingVolumeM3().compareTo(shipment.getUsedVolume()) < 0) {
                throw new BadRequestException("Truck capacity exceeded: Shipment load volume (" + shipment.getUsedVolume() + " m3) exceeds truck remaining volume (" + container.getRemainingVolumeM3() + " m3).");
            }
            shipment.setContainer(container);
            shipment.setVehicleNumber(container.getVehicleNumber());
            container.setUsedWeightKg(container.getUsedWeightKg().add(shipment.getUsedWeight()));
            container.setUsedVolumeM3(container.getUsedVolumeM3().add(shipment.getUsedVolume()));
            container.setStatus(ContainerStatus.ASSIGNED);
            if (driver != null) {
                container.setDriverId(driver.getId());
                container.setDriverCode(driver.getDriverCode());
                container.setDriverName(driver.getName());
                driver.setAssignedContainerId(container.getId());
                driver.setCurrentVehicleNumber(container.getVehicleNumber());
                driverRepository.save(driver);
            }
            containerRepository.save(container);
        } else if (request.getVehicleNumber() != null && !request.getVehicleNumber().isBlank()) {
            shipment.setVehicleNumber(request.getVehicleNumber());
        }

        shipment.setStatus(ShipmentStatus.ASSIGNED);
        Shipment saved = shipmentRepository.save(shipment);

        // Record tracking & shipment event
        String staff = staffUsername != null ? staffUsername : "SYSTEM";
        ShipmentEvent event = ShipmentEvent.builder()
                .shipmentId(saved.getId())
                .oldStatus(ShipmentStatus.OPEN.name())
                .newStatus(ShipmentStatus.ASSIGNED.name())
                .changedBy(staff)
                .changedRole("LOGISTICS_ADMIN")
                .build();
        shipmentEventRepository.save(event);

        LogisticsTrackingEvent tracking = LogisticsTrackingEvent.builder()
                .shipmentId(saved.getId())
                .containerId(container != null ? container.getId() : null)
                .status(ShipmentStatus.ASSIGNED.name())
                .locationName(saved.getOrigin())
                .description("Driver [" + (driver != null ? driver.getName() : "Assigned") + "] and Truck [" + saved.getVehicleNumber() + "] assigned by " + staff)
                .build();
        trackingEventRepository.save(tracking);

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
        List<Shipment> byDirectOrderId = shipmentRepository.findByOrderId(orderId);
        Optional<OperationalOrder> orderOpt = orderRepository.findByDjangoOrderId(orderId)
                .or(() -> orderRepository.findById(orderId));
        if (orderOpt.isPresent() && orderOpt.get().getShipment() != null) {
            Shipment assignedShipment = orderOpt.get().getShipment();
            if (byDirectOrderId.stream().noneMatch(s -> s.getId().equals(assignedShipment.getId()))) {
                byDirectOrderId.add(assignedShipment);
            }
        }
        return byDirectOrderId.stream()
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
        if (targetStatus == ShipmentStatus.DELIVERED) {
            List<OperationalOrder> currentAssigned = (shipment.getAssignedOrders() != null && !shipment.getAssignedOrders().isEmpty())
                    ? shipment.getAssignedOrders()
                    : orderRepository.findByShipmentId(shipment.getId());

            boolean hasUnverifiedOrders = currentAssigned.stream()
                    .anyMatch(o -> o.getCurrentStatus() != OrderStatus.DELIVERED && o.getCurrentStatus() != OrderStatus.CANCELLED);
            if (hasUnverifiedOrders) {
                throw new BadRequestException("Cannot transition shipment to DELIVERED: All assigned orders must first be verified using Customer Delivery OTP.");
            }
            shipment.setDeliveredAt(LocalDateTime.now());

            // Release driver back to AVAILABLE state
            if (shipment.getDriverId() != null) {
                driverRepository.findById(shipment.getDriverId()).ifPresent(d -> {
                    d.setStatus(DriverStatus.AVAILABLE);
                    d.setAssignedShipmentId(null);
                    driverRepository.save(d);
                });
            }

            // Release container back to AVAILABLE state
            if (shipment.getContainer() != null) {
                Container c = shipment.getContainer();
                c.setStatus(ContainerStatus.AVAILABLE);
                containerRepository.save(c);
            }
        } else if (targetStatus == ShipmentStatus.IN_TRANSIT && shipment.getDispatchedAt() == null) {
            shipment.setDispatchedAt(LocalDateTime.now());
        }

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

        // 3. Update all assigned orders and sync to Django
        OrderStatus mappedOrderStatus = mapShipmentStatusToOrderStatus(targetStatus);
        List<OperationalOrder> assignedOrders = (updated.getAssignedOrders() != null && !updated.getAssignedOrders().isEmpty())
                ? updated.getAssignedOrders()
                : orderRepository.findByShipmentId(updated.getId());

        List<Long> orderIds = new ArrayList<>();
        for (OperationalOrder order : assignedOrders) {
            orderIds.add(order.getId());
            if (mappedOrderStatus != null && order.getCurrentStatus() != OrderStatus.DELIVERED && order.getCurrentStatus() != OrderStatus.CANCELLED) {
                OrderStatus prev = order.getCurrentStatus();
                order.setCurrentStatus(mappedOrderStatus);
                orderRepository.save(order);

                OrderStatusTransition t = OrderStatusTransition.builder()
                        .orderId(order.getId())
                        .fromStatus(prev)
                        .toStatus(mappedOrderStatus)
                        .reasonNote("Shipment #" + updated.getShipmentNumber() + " transitioned to " + targetStatus)
                        .staffId(staffId)
                        .staffUsername(staffUsername != null ? staffUsername : "SYSTEM")
                        .build();
                transitionRepository.save(t);

                djangoOrderSyncService.syncOrderStatusToDjango(
                        order.getDjangoOrderId() != null ? order.getDjangoOrderId() : order.getId(),
                        mappedOrderStatus
                );
            }
        }

        // 4. Publish Kafka event to shipment.status.updated with orderIds
        fulfillmentEventProducer.publishShipmentStatusUpdated(ShipmentStatusUpdatedEvent.builder()
                .shipmentId(updated.getId())
                .shipmentNumber(updated.getShipmentNumber())
                .orderId(updated.getOrderId())
                .orderIds(orderIds)
                .oldStatus(currentStatus.name())
                .newStatus(targetStatus.name())
                .location(updated.getDestination())
                .carrierName(updated.getCarrierName())
                .trackingNumber(updated.getTrackingNumber())
                .timestamp(LocalDateTime.now())
                .build());

        // 5. If status is OUT_FOR_DELIVERY, trigger OTP generation
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

        List<OperationalOrder> assignedOrders = (updated.getAssignedOrders() != null && !updated.getAssignedOrders().isEmpty())
                ? updated.getAssignedOrders()
                : orderRepository.findByShipmentId(updated.getId());
        List<Long> orderIds = assignedOrders.stream().map(OperationalOrder::getId).collect(Collectors.toList());

        fulfillmentEventProducer.publishShipmentLocationUpdated(ShipmentLocationUpdatedEvent.builder()
                .shipmentId(updated.getId())
                .shipmentNumber(updated.getShipmentNumber())
                .orderId(updated.getOrderId())
                .orderIds(orderIds)
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
            if (anyOutForDelivery && order.getCurrentStatus() != OrderStatus.DELIVERED && order.getCurrentStatus() != OrderStatus.CANCELLED) {
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

                Shipment primaryShp = !shipments.isEmpty() ? shipments.get(0) : null;
                djangoOrderSyncService.syncOrderStatusToDjango(
                        order.getDjangoOrderId() != null ? order.getDjangoOrderId() : order.getId(),
                        newStatus,
                        primaryShp != null ? primaryShp.getShipmentNumber() : null,
                        primaryShp != null ? primaryShp.getTrackingNumber() : null,
                        primaryShp != null ? primaryShp.getCarrierName() : null,
                        null
                );
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
    public List<RouteExceptionAudit> getRouteExceptionAudits(Long shipmentId) {
        if (shipmentId != null) {
            return routeExceptionAuditRepository.findByShipmentId(shipmentId);
        }
        return routeExceptionAuditRepository.findAllByOrderByTimestampDesc();
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
        long pendingShipments = shipmentStatusCounts.getOrDefault("OPEN", 0L)
                + shipmentStatusCounts.getOrDefault("FULL", 0L)
                + shipmentStatusCounts.getOrDefault("READY_FOR_DISPATCH", 0L)
                + shipmentStatusCounts.getOrDefault("CREATED", 0L)
                + shipmentStatusCounts.getOrDefault("PACKED", 0L);
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
        if (targetStatus == ShipmentStatus.PACKED || targetStatus == ShipmentStatus.DISPATCHED || targetStatus == ShipmentStatus.READY_FOR_DISPATCH || targetStatus == ShipmentStatus.FULL) {
            return "Warehouse Operations Staff";
        }
        if (staffUsername != null && staffUsername.toUpperCase().contains("ADMIN")) {
            return "Admin";
        }
        return "Operations Staff";
    }

    public static OrderStatus mapShipmentStatusToOrderStatus(ShipmentStatus shipmentStatus) {
        if (shipmentStatus == null) return null;
        switch (shipmentStatus) {
            case CREATED:
            case OPEN:
                return OrderStatus.ORDER_CONFIRMED;
            case PACKED:
                return OrderStatus.PACKED;
            case READY_FOR_DISPATCH:
            case FULL:
                return OrderStatus.READY_FOR_SHIPMENT;
            case DISPATCHED:
                return OrderStatus.SHIPPED;
            case IN_TRANSIT:
            case ARRIVED_AT_HUB:
                return OrderStatus.IN_TRANSIT;
            case OUT_FOR_DELIVERY:
                return OrderStatus.OUT_FOR_DELIVERY;
            case DELIVERED:
                return OrderStatus.DELIVERED;
            case CANCELLED:
                return OrderStatus.CANCELLED;
            default:
                return null;
        }
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

        List<OrderResponse> assignedOrderResponses = new ArrayList<>();
        List<OperationalOrder> orderList = (shipment.getAssignedOrders() != null && !shipment.getAssignedOrders().isEmpty())
                ? shipment.getAssignedOrders()
                : (shipment.getId() != null ? orderRepository.findByShipmentId(shipment.getId()) : Collections.emptyList());

        List<Long> assignedOrderIds = new ArrayList<>();
        List<String> assignedOrderRefNumbers = new ArrayList<>();
        for (OperationalOrder o : orderList) {
            assignedOrderIds.add(o.getId());
            assignedOrderRefNumbers.add(o.getOrderReferenceNumber());
            assignedOrderResponses.add(OrderResponse.builder()
                    .id(o.getId())
                    .customerId(o.getCustomerId())
                    .customerUsername(o.getCustomerUsername())
                    .customerEmail(o.getCustomerEmail())
                    .customerName(o.getCustomerName())
                    .totalAmount(o.getTotalAmount())
                    .city(o.getCity())
                    .state(o.getState())
                    .shippingAddress(o.getShippingAddress())
                    .currentStatus(o.getCurrentStatus())
                    .totalWeightKg(o.resolveWeight())
                    .totalVolumeM3(o.resolveVolume())
                    .deliveredAt(o.getDeliveredAt())
                    .cancellationReason(o.getCancellationReason())
                    .refundStatus(o.getRefundStatus())
                    .createdAt(o.getCreatedAt())
                    .build());
        }

        BigDecimal maxW = shipment.getMaxWeight() != null ? shipment.getMaxWeight() : new BigDecimal("10000.00");
        BigDecimal maxV = shipment.getMaxVolume() != null ? shipment.getMaxVolume() : new BigDecimal("35.00");
        BigDecimal usedW = shipment.getUsedWeight() != null ? shipment.getUsedWeight() : BigDecimal.ZERO;
        BigDecimal usedV = shipment.getUsedVolume() != null ? shipment.getUsedVolume() : BigDecimal.ZERO;
        BigDecimal remW = maxW.subtract(usedW).max(BigDecimal.ZERO);
        BigDecimal remV = maxV.subtract(usedV).max(BigDecimal.ZERO);

        double weightPct = maxW.compareTo(BigDecimal.ZERO) > 0 ? (usedW.doubleValue() / maxW.doubleValue()) * 100.0 : 0.0;
        double volPct = maxV.compareTo(BigDecimal.ZERO) > 0 ? (usedV.doubleValue() / maxV.doubleValue()) * 100.0 : 0.0;

        return ShipmentResponse.builder()
                .id(shipment.getId())
                .shipmentNumber(shipment.getShipmentNumber())
                .orderId(shipment.getOrderId())
                .containerId(shipment.getContainer() != null ? shipment.getContainer().getId() : null)
                .containerCode(shipment.getContainer() != null ? shipment.getContainer().getContainerCode() : null)
                .status(shipment.getStatus())
                .carrierName(shipment.getCarrierName())
                .trackingNumber(shipment.getTrackingNumber())
                .warehouse(shipment.getWarehouse() != null ? shipment.getWarehouse() : shipment.getOrigin())
                .driverId(shipment.getDriverId())
                .driverCode(shipment.getDriverCode())
                .driverName(shipment.getDriverName())
                .driverPhone(shipment.getDriverPhone())
                .vehicleNumber(shipment.getVehicleNumber())
                .origin(shipment.getOrigin())
                .destination(shipment.getDestination())
                .route(shipment.getRoute())
                .maxWeight(maxW)
                .maxVolume(maxV)
                .usedWeight(usedW)
                .usedVolume(usedV)
                .remainingWeight(remW)
                .remainingVolume(remV)
                .weightUtilizationPercent(Math.round(weightPct * 10.0) / 10.0)
                .volumeUtilizationPercent(Math.round(volPct * 10.0) / 10.0)
                .assignedOrderCount(assignedOrderResponses.size())
                .canAcceptOrders(shipment.canAcceptOrders())
                .estimatedDelivery(shipment.getEstimatedDelivery())
                .dispatchedAt(shipment.getDispatchedAt())
                .deliveredAt(shipment.getDeliveredAt())
                .currentLatitude(shipment.getCurrentLatitude())
                .currentLongitude(shipment.getCurrentLongitude())
                .lastLocationUpdate(shipment.getLastLocationUpdate())
                .items(itemResponses)
                .events(eventResponses)
                .assignedOrders(assignedOrderResponses)
                .assignedOrderIds(assignedOrderIds)
                .assignedOrderRefNumbers(assignedOrderRefNumbers)
                .createdAt(shipment.getCreatedAt())
                .updatedAt(shipment.getUpdatedAt())
                .build();
    }
}
