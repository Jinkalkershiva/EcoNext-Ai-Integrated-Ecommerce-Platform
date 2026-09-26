package com.econext.admin.controller;

import com.econext.admin.dto.request.RoleCreateRequest;
import com.econext.admin.dto.request.RoleUpdateRequest;
import com.econext.admin.dto.response.ApiResponse;
import com.econext.admin.dto.response.RoleResponse;
import com.econext.admin.entity.PermissionType;
import com.econext.admin.security.StaffPrincipal;
import com.econext.admin.service.RoleManagementService;
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
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Tag(name = "Roles & Permissions Management", description = "Endpoints for managing operational roles and assigning fine-grained permissions")
public class RoleManagementController {

    private final RoleManagementService roleService;

    @GetMapping("/roles")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('STAFF_READ')")
    @Operation(summary = "List all configurable operational roles and their assigned permissions")
    public ResponseEntity<ApiResponse<List<RoleResponse>>> getAllRoles() {
        List<RoleResponse> roles = roleService.getAllRoles();
        return ResponseEntity.ok(ApiResponse.ok(roles));
    }

    @GetMapping("/roles/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @Operation(summary = "Get role details by ID")
    public ResponseEntity<ApiResponse<RoleResponse>> getRoleById(@PathVariable Long id) {
        RoleResponse role = roleService.getRoleById(id);
        return ResponseEntity.ok(ApiResponse.ok(role));
    }

    @PostMapping("/roles")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @Operation(summary = "Create a new custom operational staff role")
    public ResponseEntity<ApiResponse<RoleResponse>> createRole(
            @Valid @RequestBody RoleCreateRequest request,
            @AuthenticationPrincipal StaffPrincipal principal
    ) {
        String actor = principal != null ? principal.getUsername() : "ADMIN";
        RoleResponse created = roleService.createRole(request, actor);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Role created successfully", created));
    }

    @PutMapping("/roles/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @Operation(summary = "Update an existing role's permissions or description")
    public ResponseEntity<ApiResponse<RoleResponse>> updateRole(
            @PathVariable Long id,
            @Valid @RequestBody RoleUpdateRequest request,
            @AuthenticationPrincipal StaffPrincipal principal
    ) {
        String actor = principal != null ? principal.getUsername() : "ADMIN";
        RoleResponse updated = roleService.updateRole(id, request, actor);
        return ResponseEntity.ok(ApiResponse.ok("Role updated successfully", updated));
    }

    @DeleteMapping("/roles/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @Operation(summary = "Delete a custom role (system roles cannot be deleted)")
    public ResponseEntity<ApiResponse<Void>> deleteRole(
            @PathVariable Long id,
            @AuthenticationPrincipal StaffPrincipal principal
    ) {
        String actor = principal != null ? principal.getUsername() : "ADMIN";
        roleService.deleteRole(id, actor);
        return ResponseEntity.ok(ApiResponse.ok("Role deleted successfully", null));
    }

    @GetMapping("/permissions")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('STAFF_READ')")
    @Operation(summary = "List all available fine-grained system permission keys")
    public ResponseEntity<ApiResponse<List<PermissionType>>> getAllPermissions() {
        List<PermissionType> permissions = roleService.getAllAvailablePermissions();
        return ResponseEntity.ok(ApiResponse.ok(permissions));
    }
}
