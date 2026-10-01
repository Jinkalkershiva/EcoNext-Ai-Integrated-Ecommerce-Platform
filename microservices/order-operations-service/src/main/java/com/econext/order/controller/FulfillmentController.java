package com.econext.order.controller;

import com.econext.order.dto.*;
import com.econext.order.entity.ContainerStatus;
import com.econext.order.entity.ShipmentStatus;
import com.econext.order.security.JwtTokenFilter.OperationalStaffPrincipal;
import com.econext.order.service.ContainerService;
import com.econext.order.service.ShipmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/order-ops")
@RequiredArgsConstructor
@Tag(name = "Fulfillment & Logistics Operations", description = "Endpoints for multi-shipment dispatch, logistics container clustering and location tracking")
public class FulfillmentController {

    private final ShipmentService shipmentService;
    private final ContainerService containerService;
    private final com.econext.order.service.DeliveryOtpService deliveryOtpService;

    // ==========================================
    // Shipment Endpoints
    // ==========================================

    @GetMapping("/shipments")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('ORDER_READ')")
    @Operation(summary = "Search and filter shipments with enterprise location, hub, state, city, pincode, carrier and date filters")
    public ResponseEntity<ApiResponse<Page<ShipmentResponse>>> searchShipments(
            @RequestParam(required = false) Long orderId,
            @RequestParam(required = false) ShipmentStatus status,
            @RequestParam(required = false) Long containerId,
            @RequestParam(required = false) String warehouse,
            @RequestParam(required = false) String hub,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String pincode,
            @RequestParam(required = false) String carrier,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) java.time.LocalDateTime fromTime,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) java.time.LocalDateTime toTime,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDir
    ) {
        Sort sort = sortDir.equalsIgnoreCase("ASC") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);
        Page<ShipmentResponse> shipments = shipmentService.searchShipments(
                orderId, status, containerId, warehouse, hub, state, city, pincode, carrier, fromTime, toTime, search, pageable
        );
        return ResponseEntity.ok(ApiResponse.ok(shipments));
    }

    @GetMapping("/orders/{orderId}/shipments")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('ORDER_READ')")
    @Operation(summary = "Get all shipments for a specific order")
    public ResponseEntity<ApiResponse<List<ShipmentResponse>>> getShipmentsByOrderId(@PathVariable Long orderId) {
        List<ShipmentResponse> shipments = shipmentService.getShipmentsByOrderId(orderId);
        return ResponseEntity.ok(ApiResponse.ok(shipments));
    }

    @GetMapping("/shipments/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('ORDER_READ')")
    @Operation(summary = "Get detailed shipment by ID")
    public ResponseEntity<ApiResponse<ShipmentResponse>> getShipmentById(@PathVariable Long id) {
        ShipmentResponse shipment = shipmentService.getShipmentById(id);
        return ResponseEntity.ok(ApiResponse.ok(shipment));
    }

    @GetMapping("/shipments/{id}/events")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('ORDER_READ')")
    @Operation(summary = "Get historical shipment status events audit trail")
    public ResponseEntity<ApiResponse<List<ShipmentEventResponse>>> getShipmentEvents(@PathVariable Long id) {
        List<ShipmentEventResponse> events = shipmentService.getShipmentEvents(id);
        return ResponseEntity.ok(ApiResponse.ok(events));
    }

    // Called by API Gateway (/api/order-ops/shipments) when staff creates a shipment from packed order items.
    // Persists shipment in MySQL and publishes SHIPMENT_CREATED to Kafka topic 'shipment.status.updated'.
    @PostMapping("/shipments")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('ORDER_PROCESS') or hasAuthority('ORDER_STATUS_UPDATE')")
    @Operation(summary = "Create and allocate order items to a new shipment")
    public ResponseEntity<ApiResponse<ShipmentResponse>> createShipment(
            @Valid @RequestBody CreateShipmentRequest request,
            @AuthenticationPrincipal OperationalStaffPrincipal principal
    ) {
        Long staffId = principal != null ? principal.getId() : null;
        String staffUsername = principal != null ? principal.getUsername() : "ADMIN";
        ShipmentResponse created = shipmentService.createShipment(request, staffId, staffUsername);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Shipment #" + created.getShipmentNumber() + " created successfully", created));
    }

    // Called by API Gateway when staff transitions shipment status (DISPATCHED, IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED).
    // Dispatches Kafka event 'shipment.status.updated' which WebSocket consumer broadcasts to live tracking clients.
    @PatchMapping("/shipments/{id}/status")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('ORDER_STATUS_UPDATE') or hasAuthority('ORDER_PROCESS')")
    @Operation(summary = "Transition shipment lifecycle state")
    public ResponseEntity<ApiResponse<ShipmentResponse>> updateShipmentStatus(
            @PathVariable Long id,
            @RequestParam ShipmentStatus status,
            @AuthenticationPrincipal OperationalStaffPrincipal principal
    ) {
        Long staffId = principal != null ? principal.getId() : null;
        String staffUsername = principal != null ? principal.getUsername() : "ADMIN";
        ShipmentResponse updated = shipmentService.updateShipmentStatus(id, status, staffId, staffUsername);
        return ResponseEntity.ok(ApiResponse.ok("Shipment status transitioned to " + updated.getStatus(), updated));
    }

    // Called by API Gateway / mobile courier app when GPS coordinates update for a vehicle in transit.
    // Publishes to Kafka topic 'shipment.location.updated' which pushes live coordinates to STOMP destination /topic/shipments/{id}.
    @PatchMapping("/shipments/{id}/location")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('ORDER_STATUS_UPDATE') or hasAuthority('ORDER_PROCESS')")
    @Operation(summary = "Update physical GPS coordinates and location milestone for a shipment")
    public ResponseEntity<ApiResponse<ShipmentResponse>> updateShipmentLocation(
            @PathVariable Long id,
            @Valid @RequestBody UpdateShipmentLocationRequest request,
            @AuthenticationPrincipal OperationalStaffPrincipal principal
    ) {
        Long staffId = principal != null ? principal.getId() : null;
        String staffUsername = principal != null ? principal.getUsername() : "ADMIN";
        ShipmentResponse updated = shipmentService.updateShipmentLocation(id, request, staffId, staffUsername);
        return ResponseEntity.ok(ApiResponse.ok("Shipment GPS telemetry updated successfully", updated));
    }

    @GetMapping("/shipments/{id}/tracking")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('ORDER_READ')")
    @Operation(summary = "Get historical tracking and location events for a shipment")
    public ResponseEntity<ApiResponse<List<LogisticsTrackingResponse>>> getShipmentTracking(@PathVariable Long id) {
        List<LogisticsTrackingResponse> tracking = shipmentService.getShipmentTracking(id);
        return ResponseEntity.ok(ApiResponse.ok(tracking));
    }

    // ==========================================
    // Delivery OTP & Customer Verification
    // ==========================================

    @PostMapping({"/shipments/{id}/delivery-otp/send", "/shipments/{id}/send-otp"})
    @Operation(summary = "Generate and dispatch a secure 6-digit Delivery PIN / OTP to customer")
    public ResponseEntity<ApiResponse<DeliveryOtpResponse>> sendDeliveryOtp(
            @PathVariable Long id,
            @AuthenticationPrincipal OperationalStaffPrincipal principal
    ) {
        Long staffId = principal != null ? principal.getId() : null;
        String staffUsername = principal != null ? principal.getUsername() : "SYSTEM";
        DeliveryOtpResponse response = deliveryOtpService.generateAndSendOtp(id, staffId, staffUsername);
        return ResponseEntity.ok(ApiResponse.ok("Delivery PIN generated and dispatched successfully", response));
    }

    @PostMapping({"/shipments/{id}/delivery-otp/verify", "/shipments/{id}/verify-delivery-pin"})
    @Operation(summary = "Verify customer Delivery PIN / OTP and mark shipment & order as DELIVERED")
    public ResponseEntity<ApiResponse<DeliveryOtpResponse>> verifyDeliveryOtp(
            @PathVariable Long id,
            @RequestBody(required = false) DeliveryOtpVerifyRequest request,
            @RequestParam(required = false) String otp,
            @AuthenticationPrincipal OperationalStaffPrincipal principal
    ) {
        String rawOtp = (request != null && request.getOtp() != null) ? request.getOtp() : otp;
        Long staffId = principal != null ? principal.getId() : (request != null ? request.getDeliveryStaffId() : null);
        String staffUsername = principal != null ? principal.getUsername() : (request != null && request.getDeliveryStaffUsername() != null ? request.getDeliveryStaffUsername() : "DELIVERY_AGENT");

        DeliveryOtpResponse response = deliveryOtpService.verifyDeliveryOtp(id, rawOtp, staffId, staffUsername);
        return ResponseEntity.ok(ApiResponse.ok(response.getMessage(), response));
    }

    @GetMapping("/shipments/{id}/delivery-otp/status")
    @Operation(summary = "Check status and remaining TTL of active Delivery PIN for a shipment")
    public ResponseEntity<ApiResponse<DeliveryOtpResponse>> getDeliveryOtpStatus(@PathVariable Long id) {
        DeliveryOtpResponse response = deliveryOtpService.getOtpStatus(id);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping({"/orders/{orderId}/delivery-otp/send"})
    @Operation(summary = "Generate and dispatch Delivery PIN for active shipment of an order")
    public ResponseEntity<ApiResponse<DeliveryOtpResponse>> sendOrderDeliveryOtp(
            @PathVariable Long orderId,
            @AuthenticationPrincipal OperationalStaffPrincipal principal
    ) {
        List<ShipmentResponse> shipments = shipmentService.getShipmentsByOrderId(orderId);
        if (shipments.isEmpty()) {
            throw new com.econext.order.exception.GlobalExceptionHandler.ResourceNotFoundException("No shipment found for order #" + orderId);
        }
        ShipmentResponse target = shipments.stream()
                .filter(s -> s.getStatus() == ShipmentStatus.OUT_FOR_DELIVERY || s.getStatus() != ShipmentStatus.DELIVERED)
                .findFirst()
                .orElse(shipments.get(0));

        Long staffId = principal != null ? principal.getId() : null;
        String staffUsername = principal != null ? principal.getUsername() : "SYSTEM";
        DeliveryOtpResponse response = deliveryOtpService.generateAndSendOtp(target.getId(), staffId, staffUsername);
        return ResponseEntity.ok(ApiResponse.ok("Delivery PIN generated and dispatched successfully", response));
    }

    @PostMapping({"/orders/{orderId}/delivery-otp/verify"})
    @Operation(summary = "Verify customer Delivery PIN for active shipment of an order and mark DELIVERED")
    public ResponseEntity<ApiResponse<DeliveryOtpResponse>> verifyOrderDeliveryOtp(
            @PathVariable Long orderId,
            @RequestBody(required = false) DeliveryOtpVerifyRequest request,
            @RequestParam(required = false) String otp,
            @AuthenticationPrincipal OperationalStaffPrincipal principal
    ) {
        List<ShipmentResponse> shipments = shipmentService.getShipmentsByOrderId(orderId);
        if (shipments.isEmpty()) {
            throw new com.econext.order.exception.GlobalExceptionHandler.ResourceNotFoundException("No shipment found for order #" + orderId);
        }
        ShipmentResponse target = shipments.stream()
                .filter(s -> s.getStatus() == ShipmentStatus.OUT_FOR_DELIVERY || s.getStatus() != ShipmentStatus.DELIVERED)
                .findFirst()
                .orElse(shipments.get(0));

        String rawOtp = (request != null && request.getOtp() != null) ? request.getOtp() : otp;
        Long staffId = principal != null ? principal.getId() : (request != null ? request.getDeliveryStaffId() : null);
        String staffUsername = principal != null ? principal.getUsername() : (request != null && request.getDeliveryStaffUsername() != null ? request.getDeliveryStaffUsername() : "DELIVERY_AGENT");

        DeliveryOtpResponse response = deliveryOtpService.verifyDeliveryOtp(target.getId(), rawOtp, staffId, staffUsername);
        return ResponseEntity.ok(ApiResponse.ok(response.getMessage(), response));
    }

    @GetMapping({"/fulfillment/summary", "/fulfillment-summary"})
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('ORDER_READ')")
    @Operation(summary = "Get operational fulfillment analytics summary, status distributions and live KPIs")
    public ResponseEntity<ApiResponse<FulfillmentSummaryResponse>> getFulfillmentSummary(
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) java.time.LocalDateTime fromTime,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) java.time.LocalDateTime toTime
    ) {
        FulfillmentSummaryResponse summary = shipmentService.getFulfillmentSummary(fromTime, toTime);
        return ResponseEntity.ok(ApiResponse.ok(summary));
    }


    // ==========================================
    // Container Endpoints
    // ==========================================

    @GetMapping("/containers")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('ORDER_READ')")
    @Operation(summary = "Search and filter logistics containers")
    public ResponseEntity<ApiResponse<Page<ContainerResponse>>> searchContainers(
            @RequestParam(required = false) ContainerStatus status,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDir
    ) {
        Sort sort = sortDir.equalsIgnoreCase("ASC") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);
        Page<ContainerResponse> containers = containerService.searchContainers(status, search, pageable);
        return ResponseEntity.ok(ApiResponse.ok(containers));
    }

    @GetMapping("/containers/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('ORDER_READ')")
    @Operation(summary = "Get container details by ID")
    public ResponseEntity<ApiResponse<ContainerResponse>> getContainerById(@PathVariable Long id) {
        ContainerResponse container = containerService.getContainerById(id);
        return ResponseEntity.ok(ApiResponse.ok(container));
    }

    @PostMapping("/containers")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('ORDER_PROCESS') or hasAuthority('ORDER_STATUS_UPDATE')")
    @Operation(summary = "Provision a new logistics container")
    public ResponseEntity<ApiResponse<ContainerResponse>> createContainer(
            @Valid @RequestBody CreateContainerRequest request
    ) {
        ContainerResponse created = containerService.createContainer(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Container [" + created.getContainerCode() + "] created successfully", created));
    }

    @PatchMapping("/containers/{id}/status")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('ORDER_STATUS_UPDATE') or hasAuthority('ORDER_PROCESS')")
    @Operation(summary = "Update container operational status")
    public ResponseEntity<ApiResponse<ContainerResponse>> updateContainerStatus(
            @PathVariable Long id,
            @RequestParam ContainerStatus status,
            @AuthenticationPrincipal OperationalStaffPrincipal principal
    ) {
        Long staffId = principal != null ? principal.getId() : null;
        String staffUsername = principal != null ? principal.getUsername() : "ADMIN";
        ContainerResponse updated = containerService.updateContainerStatus(id, status, staffId, staffUsername);
        return ResponseEntity.ok(ApiResponse.ok("Container status updated to " + updated.getStatus(), updated));
    }

    @PatchMapping("/containers/{id}/location")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('ORDER_STATUS_UPDATE') or hasAuthority('ORDER_PROCESS')")
    @Operation(summary = "Update container physical GPS latitude/longitude location")
    public ResponseEntity<ApiResponse<ContainerResponse>> updateContainerLocation(
            @PathVariable Long id,
            @Valid @RequestBody UpdateContainerLocationRequest request
    ) {
        ContainerResponse updated = containerService.updateContainerLocation(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Container location telemetry updated successfully", updated));
    }

    @PostMapping("/containers/{id}/shipments/{shipmentId}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('ORDER_PROCESS') or hasAuthority('ORDER_STATUS_UPDATE')")
    @Operation(summary = "Assign a shipment to a logistics container")
    public ResponseEntity<ApiResponse<String>> assignShipmentToContainer(
            @PathVariable Long id,
            @PathVariable Long shipmentId
    ) {
        containerService.assignShipmentToContainer(id, shipmentId);
        return ResponseEntity.ok(ApiResponse.ok("Shipment #" + shipmentId + " assigned to Container #" + id));
    }

    @GetMapping("/containers/{id}/tracking")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('ORDER_READ')")
    @Operation(summary = "Get historical GPS and location tracking events for a container")
    public ResponseEntity<ApiResponse<List<LogisticsTrackingResponse>>> getContainerTracking(@PathVariable Long id) {
        List<LogisticsTrackingResponse> tracking = containerService.getContainerTracking(id);
        return ResponseEntity.ok(ApiResponse.ok(tracking));
    }
}
