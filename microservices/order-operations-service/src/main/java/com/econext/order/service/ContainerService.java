package com.econext.order.service;

import com.econext.order.dto.ContainerResponse;
import com.econext.order.dto.CreateContainerRequest;
import com.econext.order.dto.LogisticsTrackingResponse;
import com.econext.order.dto.UpdateContainerLocationRequest;
import com.econext.order.dto.event.ContainerStatusUpdatedEvent;
import com.econext.order.entity.Container;
import com.econext.order.entity.ContainerStatus;
import com.econext.order.entity.LogisticsTrackingEvent;
import com.econext.order.entity.Shipment;
import com.econext.order.exception.GlobalExceptionHandler.BadRequestException;
import com.econext.order.exception.GlobalExceptionHandler.ResourceNotFoundException;
import com.econext.order.kafka.FulfillmentEventProducer;
import com.econext.order.repository.ContainerRepository;
import com.econext.order.repository.LogisticsTrackingEventRepository;
import com.econext.order.repository.ShipmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ContainerService {

    private final ContainerRepository containerRepository;
    private final ShipmentRepository shipmentRepository;
    private final LogisticsTrackingEventRepository trackingEventRepository;
    private final FulfillmentEventProducer fulfillmentEventProducer;

    private static final Map<ContainerStatus, Set<ContainerStatus>> ALLOWED_CONTAINER_TRANSITIONS = Map.ofEntries(
            Map.entry(ContainerStatus.CREATED, Set.of(ContainerStatus.PACKED, ContainerStatus.CLOSED)),
            Map.entry(ContainerStatus.PACKED, Set.of(ContainerStatus.DISPATCHED, ContainerStatus.CLOSED)),
            Map.entry(ContainerStatus.DISPATCHED, Set.of(ContainerStatus.IN_TRANSIT, ContainerStatus.ARRIVED_AT_HUB, ContainerStatus.CLOSED)),
            Map.entry(ContainerStatus.IN_TRANSIT, Set.of(ContainerStatus.ARRIVED_AT_HUB, ContainerStatus.CLOSED)),
            Map.entry(ContainerStatus.ARRIVED_AT_HUB, Set.of(ContainerStatus.IN_TRANSIT, ContainerStatus.CLOSED)),
            Map.entry(ContainerStatus.CLOSED, Set.of())
    );

    @Transactional
    public ContainerResponse createContainer(CreateContainerRequest request) {
        if (containerRepository.findByContainerCode(request.getContainerCode()).isPresent()) {
            throw new BadRequestException("Container with code '" + request.getContainerCode() + "' already exists.");
        }

        BigDecimal maxW = request.getMaxWeightKg() != null ? request.getMaxWeightKg() : new BigDecimal("25000.00");
        BigDecimal maxV = request.getMaxVolumeM3() != null ? request.getMaxVolumeM3() : new BigDecimal("80.00");
        String vehicleNumber = request.getVehicleNumber() != null && !request.getVehicleNumber().isBlank()
                ? request.getVehicleNumber()
                : "KA-01-TRUCK-" + (1000 + (System.currentTimeMillis() % 9000));

        Container container = Container.builder()
                .containerCode(request.getContainerCode())
                .status(ContainerStatus.CREATED)
                .origin(request.getOrigin())
                .destination(request.getDestination())
                .route(request.getRoute())
                .vehicleNumber(vehicleNumber)
                .maxWeightKg(maxW)
                .maxVolumeM3(maxV)
                .usedWeightKg(BigDecimal.ZERO)
                .usedVolumeM3(BigDecimal.ZERO)
                .currentLatitude(request.getCurrentLatitude())
                .currentLongitude(request.getCurrentLongitude())
                .lastLocationUpdate(request.getCurrentLatitude() != null ? LocalDateTime.now() : null)
                .build();

        Container saved = containerRepository.save(container);
        return mapToResponse(saved);
    }

    @Transactional(readOnly = true)
    public ContainerResponse getContainerById(Long id) {
        Container container = containerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Container not found with ID: " + id));
        return mapToResponse(container);
    }

    @Transactional
    public ContainerResponse updateContainerStatus(Long id, ContainerStatus targetStatus, Long staffId, String staffUsername) {
        Container container = containerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Container not found with ID: " + id));

        ContainerStatus currentStatus = container.getStatus();
        if (currentStatus == targetStatus) {
            return mapToResponse(container);
        }

        Set<ContainerStatus> allowed = ALLOWED_CONTAINER_TRANSITIONS.getOrDefault(currentStatus, Collections.emptySet());
        if (!allowed.contains(targetStatus)) {
            throw new BadRequestException("Invalid container status transition from " + currentStatus + " to " + targetStatus);
        }

        container.setStatus(targetStatus);
        Container updated = containerRepository.save(container);

        // idx-04: Container Service → Logistics Tracking Repository
        // reason: Store container status change event in tracking history.
        LogisticsTrackingEvent event = LogisticsTrackingEvent.builder()
                .containerId(updated.getId())
                .status(targetStatus.name())
                .locationName(updated.getDestination())
                .latitude(updated.getCurrentLatitude())
                .longitude(updated.getCurrentLongitude())
                .description("Container status transitioned to " + targetStatus.name() + " by " + (staffUsername != null ? staffUsername : "STAFF"))
                .build();
        trackingEventRepository.save(event);

        // idx-08: Order Operations Service → Kafka Topic (container.status.updated)
        // reason: Broadcast container batch movement status.
        fulfillmentEventProducer.publishContainerStatusUpdated(ContainerStatusUpdatedEvent.builder()
                .containerId(updated.getId())
                .containerCode(updated.getContainerCode())
                .status(targetStatus.name())
                .previousStatus(currentStatus.name())
                .origin(updated.getOrigin())
                .destination(updated.getDestination())
                .timestamp(LocalDateTime.now())
                .build());

        return mapToResponse(updated);
    }

    @Transactional
    public ContainerResponse updateContainerLocation(Long id, UpdateContainerLocationRequest request) {
        Container container = containerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Container not found with ID: " + id));

        container.setCurrentLatitude(request.getLatitude());
        container.setCurrentLongitude(request.getLongitude());
        container.setLastLocationUpdate(LocalDateTime.now());
        Container updated = containerRepository.save(container);

        // idx-05: Container Service → Logistics Tracking Repository
        // reason: Store latest container physical location coordinates and audit trail.
        LogisticsTrackingEvent event = LogisticsTrackingEvent.builder()
                .containerId(updated.getId())
                .status(updated.getStatus().name())
                .locationName(request.getLocationName() != null ? request.getLocationName() : updated.getDestination())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .description(request.getNote() != null ? request.getNote() : "GPS location update: lat=" + request.getLatitude() + ", lon=" + request.getLongitude())
                .build();
        trackingEventRepository.save(event);

        return mapToResponse(updated);
    }

    @Transactional
    public Shipment assignShipmentToContainer(Long containerId, Long shipmentId) {
        Container container = containerRepository.findById(containerId)
                .orElseThrow(() -> new ResourceNotFoundException("Container not found with ID: " + containerId));
        Shipment shipment = shipmentRepository.findById(shipmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment not found with ID: " + shipmentId));

        if (!container.canAcceptShipments()) {
            throw new BadRequestException("Container [" + container.getContainerCode() + "] is in status " + container.getStatus() + " and cannot accept shipments.");
        }

        BigDecimal shpWeight = shipment.getUsedWeight() != null ? shipment.getUsedWeight() : BigDecimal.ZERO;
        BigDecimal shpVolume = shipment.getUsedVolume() != null ? shipment.getUsedVolume() : BigDecimal.ZERO;

        if (container.getRemainingWeightKg().compareTo(shpWeight) < 0) {
            throw new BadRequestException("Container Capacity Exceeded: Shipment weight (" + shpWeight + " kg) exceeds container remaining capacity (" + container.getRemainingWeightKg() + " kg).");
        }
        if (container.getRemainingVolumeM3().compareTo(shpVolume) < 0) {
            throw new BadRequestException("Container Capacity Exceeded: Shipment volume (" + shpVolume + " m3) exceeds container remaining capacity (" + container.getRemainingVolumeM3() + " m3).");
        }

        // Update container load
        container.setUsedWeightKg(container.getUsedWeightKg().add(shpWeight));
        container.setUsedVolumeM3(container.getUsedVolumeM3().add(shpVolume));
        containerRepository.save(container);

        shipment.setContainer(container);
        if (container.getVehicleNumber() != null && !container.getVehicleNumber().isBlank()) {
            shipment.setVehicleNumber(container.getVehicleNumber());
        }
        Shipment savedShipment = shipmentRepository.save(shipment);

        LogisticsTrackingEvent tracking = LogisticsTrackingEvent.builder()
                .shipmentId(savedShipment.getId())
                .containerId(container.getId())
                .status(savedShipment.getStatus().name())
                .locationName(container.getOrigin())
                .description("Shipment #" + savedShipment.getShipmentNumber() + " loaded onto Truck/Container [" + container.getContainerCode() + "] (Vehicle: " + container.getVehicleNumber() + ")")
                .build();
        trackingEventRepository.save(tracking);

        return savedShipment;
    }

    @Transactional(readOnly = true)
    public Page<ContainerResponse> searchContainers(ContainerStatus status, String search, Pageable pageable) {
        return containerRepository.searchContainers(status, search, pageable)
                .map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public List<LogisticsTrackingResponse> getContainerTracking(Long id) {
        return trackingEventRepository.findByContainerIdOrderByTimestampAsc(id).stream()
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

    private ContainerResponse mapToResponse(Container c) {
        BigDecimal maxW = c.getMaxWeightKg() != null ? c.getMaxWeightKg() : new BigDecimal("25000.00");
        BigDecimal maxV = c.getMaxVolumeM3() != null ? c.getMaxVolumeM3() : new BigDecimal("80.00");
        BigDecimal usedW = c.getUsedWeightKg() != null ? c.getUsedWeightKg() : BigDecimal.ZERO;
        BigDecimal usedV = c.getUsedVolumeM3() != null ? c.getUsedVolumeM3() : BigDecimal.ZERO;
        BigDecimal remW = maxW.subtract(usedW).max(BigDecimal.ZERO);
        BigDecimal remV = maxV.subtract(usedV).max(BigDecimal.ZERO);

        double weightPct = maxW.compareTo(BigDecimal.ZERO) > 0 ? (usedW.doubleValue() / maxW.doubleValue()) * 100.0 : 0.0;
        double volPct = maxV.compareTo(BigDecimal.ZERO) > 0 ? (usedV.doubleValue() / maxV.doubleValue()) * 100.0 : 0.0;

        return ContainerResponse.builder()
                .id(c.getId())
                .containerCode(c.getContainerCode())
                .status(c.getStatus())
                .warehouse(c.getWarehouse() != null ? c.getWarehouse() : c.getOrigin())
                .driverId(c.getDriverId())
                .driverCode(c.getDriverCode())
                .driverName(c.getDriverName())
                .origin(c.getOrigin())
                .destination(c.getDestination())
                .route(c.getRoute())
                .vehicleNumber(c.getVehicleNumber())
                .maxWeightKg(maxW)
                .maxVolumeM3(maxV)
                .usedWeightKg(usedW)
                .usedVolumeM3(usedV)
                .remainingWeightKg(remW)
                .remainingVolumeM3(remV)
                .weightUtilizationPercent(Math.round(weightPct * 10.0) / 10.0)
                .volumeUtilizationPercent(Math.round(volPct * 10.0) / 10.0)
                .canAcceptShipments(c.canAcceptShipments())
                .currentLatitude(c.getCurrentLatitude())
                .currentLongitude(c.getCurrentLongitude())
                .lastLocationUpdate(c.getLastLocationUpdate())
                .shipmentCount(c.getShipments() != null ? c.getShipments().size() : 0)
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }
}
