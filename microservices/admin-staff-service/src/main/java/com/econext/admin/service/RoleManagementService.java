package com.econext.admin.service;

import com.econext.admin.dto.request.RoleCreateRequest;
import com.econext.admin.dto.request.RoleUpdateRequest;
import com.econext.admin.dto.response.RoleResponse;
import com.econext.admin.entity.PermissionType;
import com.econext.admin.entity.RoleDefinition;
import com.econext.admin.exception.BadRequestException;
import com.econext.admin.exception.ResourceNotFoundException;
import com.econext.admin.repository.RoleDefinitionRepository;
import com.econext.admin.repository.StaffMemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RoleManagementService {

    private final RoleDefinitionRepository roleRepository;
    private final StaffMemberRepository staffRepository;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<RoleResponse> getAllRoles() {
        return roleRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public RoleResponse getRoleById(Long id) {
        RoleDefinition role = roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found with ID: " + id));
        return mapToResponse(role);
    }

    @Transactional
    public RoleResponse createRole(RoleCreateRequest request, String actorUsername) {
        String roleName = request.getName().trim().toUpperCase();
        if (roleRepository.existsByName(roleName)) {
            throw new BadRequestException("Role with name '" + roleName + "' already exists");
        }

        RoleDefinition role = RoleDefinition.builder()
                .name(roleName)
                .description(request.getDescription())
                .permissions(new HashSet<>(request.getPermissions()))
                .isSystemRole(false)
                .build();

        RoleDefinition saved = roleRepository.save(role);

        auditService.recordAudit(
                null,
                actorUsername,
                "ADMIN",
                "ROLE_CREATED",
                "ROLE",
                saved.getId().toString(),
                "Created new custom role: " + roleName + " with " + saved.getPermissions().size() + " permissions",
                null
        );

        return mapToResponse(saved);
    }

    @Transactional
    public RoleResponse updateRole(Long id, RoleUpdateRequest request, String actorUsername) {
        RoleDefinition role = roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found with ID: " + id));

        if (Boolean.TRUE.equals(role.getIsSystemRole()) && "ROLE_ADMIN".equalsIgnoreCase(role.getName())) {
            throw new BadRequestException("System Admin role permissions cannot be modified");
        }

        if (request.getDescription() != null) {
            role.setDescription(request.getDescription());
        }

        if (request.getPermissions() != null) {
            role.setPermissions(new HashSet<>(request.getPermissions()));
        }

        RoleDefinition updated = roleRepository.save(role);

        auditService.recordAudit(
                null,
                actorUsername,
                "ADMIN",
                "ROLE_UPDATED",
                "ROLE",
                updated.getId().toString(),
                "Updated role: " + updated.getName() + " permissions updated",
                null
        );

        return mapToResponse(updated);
    }

    @Transactional
    public void deleteRole(Long id, String actorUsername) {
        RoleDefinition role = roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found with ID: " + id));

        if (Boolean.TRUE.equals(role.getIsSystemRole())) {
            throw new BadRequestException("System predefined roles cannot be deleted");
        }

        long staffWithRole = staffRepository.findByRoleName(role.getName()).size();
        if (staffWithRole > 0) {
            throw new BadRequestException("Cannot delete role '" + role.getName() + "' because " + staffWithRole + " staff members are currently assigned to it");
        }

        roleRepository.delete(role);

        auditService.recordAudit(
                null,
                actorUsername,
                "ADMIN",
                "ROLE_DELETED",
                "ROLE",
                id.toString(),
                "Deleted role: " + role.getName(),
                null
        );
    }

    @Transactional(readOnly = true)
    public List<PermissionType> getAllAvailablePermissions() {
        return Arrays.asList(PermissionType.values());
    }

    private RoleResponse mapToResponse(RoleDefinition role) {
        long count = staffRepository.findByRoleName(role.getName()).size();
        return RoleResponse.builder()
                .id(role.getId())
                .name(role.getName())
                .description(role.getDescription())
                .permissions(role.getPermissions())
                .isSystemRole(role.getIsSystemRole())
                .staffCount(count)
                .createdAt(role.getCreatedAt())
                .updatedAt(role.getUpdatedAt())
                .build();
    }
}
