package com.econext.order.controller;

import com.econext.order.dto.*;
import com.econext.order.entity.OrderStatus;
import com.econext.order.security.JwtTokenFilter.OperationalStaffPrincipal;
import com.econext.order.service.OperationalOrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/order-ops")
@RequiredArgsConstructor
@Tag(name = "Order Lifecycle Operations", description = "Endpoints for order lifecycle state tracking, transitions, staff attribution, returns and refunds")
public class OrderOperationsController {

    private final OperationalOrderService orderService;

    // Called by API Gateway (/api/order-ops/orders) from Admin Frontend (OrdersPage).
    // Searches orders across status filters and temporal windows.
    @GetMapping("/orders")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('ORDER_READ')")
    @Operation(summary = "Search and filter operational customer orders")
    public ResponseEntity<ApiResponse<Page<OrderResponse>>> searchOrders(
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fromTime,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime toTime,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDir
    ) {
        Sort sort = sortDir.equalsIgnoreCase("ASC") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);
        Page<OrderResponse> orders = orderService.searchOrders(status, search, fromTime, toTime, pageable);
        return ResponseEntity.ok(ApiResponse.ok(orders));
    }

    // Called by API Gateway when inspecting individual order history and item allocations.
    @GetMapping("/orders/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('ORDER_READ')")
    @Operation(summary = "Get detailed order information and timeline history by ID")
    public ResponseEntity<ApiResponse<OrderResponse>> getOrderById(@PathVariable Long id) {
        OrderResponse order = orderService.getOrderById(id);
        return ResponseEntity.ok(ApiResponse.ok(order));
    }

    // Called by API Gateway from staff order detail actions (e.g., Confirm, Pack, Ship).
    // Validates sequential state machine rules and records audit transition timeline.
    @PatchMapping("/orders/{id}/status")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('ORDER_STATUS_UPDATE') or hasAuthority('ORDER_PROCESS')")
    @Operation(summary = "Transition order status to the next lifecycle stage with staff attribution")
    public ResponseEntity<ApiResponse<OrderResponse>> updateOrderStatus(
            @PathVariable Long id,
            @Valid @RequestBody OrderStatusUpdateRequest request,
            @AuthenticationPrincipal OperationalStaffPrincipal principal
    ) {
        Long staffId = principal != null ? principal.getId() : null;
        String staffUsername = principal != null ? principal.getUsername() : "ADMIN";
        OrderResponse updated = orderService.updateOrderStatus(id, request, staffId, staffUsername);
        return ResponseEntity.ok(ApiResponse.ok("Order status updated successfully to " + updated.getCurrentStatus(), updated));
    }

    @PostMapping("/orders/{id}/cancel")
    @Operation(summary = "Cancel an active customer order before physical dispatch")
    public ResponseEntity<ApiResponse<OrderResponse>> cancelOrder(
            @PathVariable Long id,
            @RequestParam(required = false) String reason,
            @AuthenticationPrincipal OperationalStaffPrincipal principal
    ) {
        Long customerId = principal != null ? principal.getId() : null;
        String customerUsername = principal != null ? principal.getUsername() : "CUSTOMER";
        OrderResponse cancelled = orderService.cancelOrder(id, reason, customerId, customerUsername);
        return ResponseEntity.ok(ApiResponse.ok("Order #" + id + " cancelled successfully", cancelled));
    }

    @GetMapping("/orders/{id}/timeline")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('ORDER_READ')")
    @Operation(summary = "Get audit timeline of status transitions for an order")
    public ResponseEntity<ApiResponse<List<OrderStatusTransitionResponse>>> getOrderTimeline(@PathVariable Long id) {
        List<OrderStatusTransitionResponse> timeline = orderService.getOrderTimeline(id);
        return ResponseEntity.ok(ApiResponse.ok(timeline));
    }

    @GetMapping("/orders/{id}/delivery-audits")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('ORDER_READ')")
    @Operation(summary = "Get delivery verification audit history for an order")
    public ResponseEntity<ApiResponse<List<DeliveryVerificationAuditResponse>>> getDeliveryAudits(@PathVariable Long id) {
        List<DeliveryVerificationAuditResponse> audits = orderService.getDeliveryAudits(id);
        return ResponseEntity.ok(ApiResponse.ok(audits));
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('ORDER_READ')")
    @Operation(summary = "Get order analytics summary (orders by status, total revenue, delivered revenue)")
    public ResponseEntity<ApiResponse<OrderSummaryResponse>> getOrderSummary() {
        OrderSummaryResponse summary = orderService.getOrderSummary();
        return ResponseEntity.ok(ApiResponse.ok(summary));
    }

    // ==========================================
    // Return & Refund Endpoints
    // ==========================================

    @PostMapping("/returns")
    @Operation(summary = "Create customer return request for a delivered order")
    public ResponseEntity<ApiResponse<OrderReturnResponse>> createReturnRequest(
            @Valid @RequestBody CreateOrderReturnRequest request,
            @AuthenticationPrincipal OperationalStaffPrincipal principal
    ) {
        Long customerId = principal != null ? principal.getId() : null;
        String customerUsername = principal != null ? principal.getUsername() : "CUSTOMER";
        OrderReturnResponse created = orderService.createReturnRequest(request, customerId, customerUsername);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Return request submitted successfully", created));
    }

    @GetMapping("/returns")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('ORDER_READ')")
    @Operation(summary = "List all customer return requests for inspection")
    public ResponseEntity<ApiResponse<List<OrderReturnResponse>>> getAllReturns() {
        List<OrderReturnResponse> returns = orderService.getAllReturns();
        return ResponseEntity.ok(ApiResponse.ok(returns));
    }

    @GetMapping("/orders/{orderId}/returns")
    @Operation(summary = "Get return requests for a specific order")
    public ResponseEntity<ApiResponse<List<OrderReturnResponse>>> getReturnsByOrderId(@PathVariable Long orderId) {
        List<OrderReturnResponse> returns = orderService.getReturnsByOrderId(orderId);
        return ResponseEntity.ok(ApiResponse.ok(returns));
    }

    @PostMapping("/returns/{id}/approve")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('ORDER_PROCESS') or hasAuthority('ORDER_STATUS_UPDATE')")
    @Operation(summary = "Approve return request and generate reverse logistics label")
    public ResponseEntity<ApiResponse<OrderReturnResponse>> approveReturn(
            @PathVariable Long id,
            @RequestBody(required = false) ReturnActionRequest request,
            @AuthenticationPrincipal OperationalStaffPrincipal principal
    ) {
        Long staffId = principal != null ? principal.getId() : null;
        String staffUsername = principal != null ? principal.getUsername() : "ADMIN";
        OrderReturnResponse approved = orderService.approveReturn(id, request, staffId, staffUsername);
        return ResponseEntity.ok(ApiResponse.ok("Return request #" + id + " approved", approved));
    }

    @PostMapping("/returns/{id}/reject")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('ORDER_PROCESS') or hasAuthority('ORDER_STATUS_UPDATE')")
    @Operation(summary = "Reject customer return request with reason")
    public ResponseEntity<ApiResponse<OrderReturnResponse>> rejectReturn(
            @PathVariable Long id,
            @RequestBody(required = false) ReturnActionRequest request,
            @AuthenticationPrincipal OperationalStaffPrincipal principal
    ) {
        Long staffId = principal != null ? principal.getId() : null;
        String staffUsername = principal != null ? principal.getUsername() : "ADMIN";
        OrderReturnResponse rejected = orderService.rejectReturn(id, request, staffId, staffUsername);
        return ResponseEntity.ok(ApiResponse.ok("Return request #" + id + " rejected", rejected));
    }

    @PostMapping("/returns/{id}/receive")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('ORDER_PROCESS') or hasAuthority('ORDER_STATUS_UPDATE')")
    @Operation(summary = "Mark returned item received at warehouse, complete inspection and trigger refund")
    public ResponseEntity<ApiResponse<OrderReturnResponse>> receiveReturn(
            @PathVariable Long id,
            @RequestBody(required = false) ReturnActionRequest request,
            @AuthenticationPrincipal OperationalStaffPrincipal principal
    ) {
        Long staffId = principal != null ? principal.getId() : null;
        String staffUsername = principal != null ? principal.getUsername() : "ADMIN";
        OrderReturnResponse received = orderService.receiveReturn(id, request, staffId, staffUsername);
        return ResponseEntity.ok(ApiResponse.ok("Return item received at warehouse and marked complete", received));
    }
}
