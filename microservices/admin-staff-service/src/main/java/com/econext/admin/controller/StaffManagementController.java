package com.econext.admin.controller;

import com.econext.admin.dto.request.CreateStaffRequest;
import com.econext.admin.dto.request.ResetPasswordRequest;
import com.econext.admin.dto.request.UpdateStaffRequest;
import com.econext.admin.dto.request.UpdateStatusRequest;
import com.econext.admin.dto.response.ApiResponse;
import com.econext.admin.dto.response.StaffResponse;
import com.econext.admin.security.StaffPrincipal;
import com.econext.admin.service.StaffManagementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/staff")
@RequiredArgsConstructor
@Tag(name = "Staff Management", description = "Operations for managing staff accounts, roles, credentials and statuses")
public class StaffManagementController {

    private final StaffManagementService staffService;

    @GetMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('STAFF_READ')")
    @Operation(summary = "List all staff members")
    public ResponseEntity<ApiResponse<List<StaffResponse>>> getAllStaff() {
        List<StaffResponse> staff = staffService.getAllStaff();
        return ResponseEntity.ok(ApiResponse.ok(staff));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('STAFF_READ')")
    @Operation(summary = "Get staff member details by ID")
    public ResponseEntity<ApiResponse<StaffResponse>> getStaffById(@PathVariable Long id) {
        StaffResponse staff = staffService.getStaffById(id);
        return ResponseEntity.ok(ApiResponse.ok(staff));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('STAFF_CREATE')")
    @Operation(summary = "Create a new staff account with assigned role and permissions")
    public ResponseEntity<ApiResponse<StaffResponse>> createStaff(
            @Valid @RequestBody CreateStaffRequest request,
            @AuthenticationPrincipal StaffPrincipal principal
    ) {
        String actor = principal != null ? principal.getUsername() : "ADMIN";
        StaffResponse created = staffService.createStaff(request, actor);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Staff member created successfully", created));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('STAFF_UPDATE')")
    @Operation(summary = "Update staff details, role, or custom permissions")
    public ResponseEntity<ApiResponse<StaffResponse>> updateStaff(
            @PathVariable Long id,
            @Valid @RequestBody UpdateStaffRequest request,
            @AuthenticationPrincipal StaffPrincipal principal
    ) {
        String actor = principal != null ? principal.getUsername() : "ADMIN";
        StaffResponse updated = staffService.updateStaff(id, request, actor);
        return ResponseEntity.ok(ApiResponse.ok("Staff member updated successfully", updated));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('STAFF_DISABLE')")
    @Operation(summary = "Activate, deactivate or suspend a staff member account")
    public ResponseEntity<ApiResponse<StaffResponse>> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateStatusRequest request,
            @AuthenticationPrincipal StaffPrincipal principal
    ) {
        String actor = principal != null ? principal.getUsername() : "ADMIN";
        StaffResponse updated = staffService.updateStatus(id, request, actor);
        return ResponseEntity.ok(ApiResponse.ok("Staff status updated successfully", updated));
    }

    @PostMapping("/{id}/reset-password")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('STAFF_UPDATE')")
    @Operation(summary = "Reset password for a staff member")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @PathVariable Long id,
            @Valid @RequestBody ResetPasswordRequest request,
            @AuthenticationPrincipal StaffPrincipal principal
    ) {
        String actor = principal != null ? principal.getUsername() : "ADMIN";
        staffService.resetPassword(id, request, actor);
        return ResponseEntity.ok(ApiResponse.ok("Password reset successfully", null));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @Operation(summary = "Delete a staff member account")
    public ResponseEntity<ApiResponse<Void>> deleteStaff(
            @PathVariable Long id,
            @AuthenticationPrincipal StaffPrincipal principal
    ) {
        String actor = principal != null ? principal.getUsername() : "ADMIN";
        staffService.deleteStaff(id, actor);
        return ResponseEntity.ok(ApiResponse.ok("Staff member deleted successfully", null));
    }
}
