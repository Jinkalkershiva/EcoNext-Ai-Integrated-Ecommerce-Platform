package com.econext.admin.service;

import com.econext.admin.dto.request.CreateStaffRequest;
import com.econext.admin.dto.request.ResetPasswordRequest;
import com.econext.admin.dto.request.UpdateStaffRequest;
import com.econext.admin.dto.request.UpdateStatusRequest;
import com.econext.admin.dto.response.StaffResponse;
import com.econext.admin.entity.PermissionType;
import com.econext.admin.entity.StaffMember;
import com.econext.admin.entity.StaffStatus;
import com.econext.admin.exception.BadRequestException;
import com.econext.admin.exception.ResourceNotFoundException;
import com.econext.admin.repository.RoleDefinitionRepository;
import com.econext.admin.repository.StaffMemberRepository;
import com.econext.admin.security.StaffUserDetailsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class StaffManagementService {

    private final StaffMemberRepository staffRepository;
    private final RoleDefinitionRepository roleRepository;
    private final StaffUserDetailsService userDetailsService;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<StaffResponse> getAllStaff() {
        return staffRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public StaffResponse getStaffById(Long id) {
        StaffMember staff = staffRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Staff member not found with ID: " + id));
        return mapToResponse(staff);
    }

    @Transactional
    public StaffResponse createStaff(CreateStaffRequest request, String creatorUsername) {
        if (staffRepository.existsByUsername(request.getUsername())) {
            throw new BadRequestException("Username '" + request.getUsername() + "' is already taken");
        }
        if (staffRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email '" + request.getEmail() + "' is already in use");
        }

        String roleName = request.getRoleName().trim().toUpperCase();
        if (!"ROLE_ADMIN".equalsIgnoreCase(roleName) && !roleRepository.existsByName(roleName)) {
            throw new BadRequestException("Role '" + roleName + "' does not exist");
        }

        StaffMember staff = StaffMember.builder()
                .name(request.getName().trim())
                .username(request.getUsername().trim())
                .email(request.getEmail().trim().toLowerCase())
                .phone(request.getPhone())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .roleName(roleName)
                .customPermissions(request.getCustomPermissions() != null ? new HashSet<>(request.getCustomPermissions()) : new HashSet<>())
                .status(request.getStatus() != null ? request.getStatus() : StaffStatus.ACTIVE)
                .createdBy(creatorUsername)
                .build();

        StaffMember saved = staffRepository.save(staff);

        auditService.recordAudit(
                null,
                creatorUsername,
                "ADMIN",
                "STAFF_CREATED",
                "STAFF",
                saved.getId().toString(),
                "Created staff member: " + saved.getUsername() + " with role: " + saved.getRoleName(),
                null
        );

        return mapToResponse(saved);
    }

    @Transactional
    public StaffResponse updateStaff(Long id, UpdateStaffRequest request, String updaterUsername) {
        StaffMember staff = staffRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Staff member not found with ID: " + id));

        if (!staff.getEmail().equalsIgnoreCase(request.getEmail().trim()) && staffRepository.existsByEmail(request.getEmail().trim())) {
            throw new BadRequestException("Email '" + request.getEmail() + "' is already in use by another staff member");
        }

        staff.setName(request.getName().trim());
        staff.setEmail(request.getEmail().trim().toLowerCase());
        staff.setPhone(request.getPhone());

        if (request.getRoleName() != null && !request.getRoleName().isBlank()) {
            String roleName = request.getRoleName().trim().toUpperCase();
            if (!"ROLE_ADMIN".equalsIgnoreCase(roleName) && !roleRepository.existsByName(roleName)) {
                throw new BadRequestException("Role '" + roleName + "' does not exist");
            }
            staff.setRoleName(roleName);
        }

        if (request.getCustomPermissions() != null) {
            staff.setCustomPermissions(new HashSet<>(request.getCustomPermissions()));
        }

        if (request.getStatus() != null) {
            staff.setStatus(request.getStatus());
        }

        StaffMember updated = staffRepository.save(staff);

        auditService.recordAudit(
                null,
                updaterUsername,
                "ADMIN",
                "STAFF_UPDATED",
                "STAFF",
                updated.getId().toString(),
                "Updated staff member: " + updated.getUsername(),
                null
        );

        return mapToResponse(updated);
    }

    @Transactional
    public StaffResponse updateStatus(Long id, UpdateStatusRequest request, String actorUsername) {
        StaffMember staff = staffRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Staff member not found with ID: " + id));

        staff.setStatus(request.getStatus());
        StaffMember updated = staffRepository.save(staff);

        auditService.recordAudit(
                null,
                actorUsername,
                "ADMIN",
                "STAFF_STATUS_CHANGED",
                "STAFF",
                updated.getId().toString(),
                "Changed status of staff member: " + updated.getUsername() + " to " + request.getStatus(),
                null
        );

        return mapToResponse(updated);
    }

    @Transactional
    public void resetPassword(Long id, ResetPasswordRequest request, String actorUsername) {
        StaffMember staff = staffRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Staff member not found with ID: " + id));

        staff.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        staffRepository.save(staff);

        auditService.recordAudit(
                null,
                actorUsername,
                "ADMIN",
                "STAFF_PASSWORD_RESET",
                "STAFF",
                staff.getId().toString(),
                "Reset password for staff member: " + staff.getUsername(),
                null
        );
    }

    @Transactional
    public void deleteStaff(Long id, String actorUsername) {
        StaffMember staff = staffRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Staff member not found with ID: " + id));

        if ("admin".equalsIgnoreCase(staff.getUsername())) {
            throw new BadRequestException("Root admin account cannot be deleted");
        }

        staffRepository.delete(staff);

        auditService.recordAudit(
                null,
                actorUsername,
                "ADMIN",
                "STAFF_DELETED",
                "STAFF",
                id.toString(),
                "Deleted staff member: " + staff.getUsername(),
                null
        );
    }

    private StaffResponse mapToResponse(StaffMember staff) {
        Set<PermissionType> effective = userDetailsService.resolveEffectivePermissions(staff);
        return StaffResponse.builder()
                .id(staff.getId())
                .name(staff.getName())
                .username(staff.getUsername())
                .email(staff.getEmail())
                .phone(staff.getPhone())
                .roleName(staff.getRoleName())
                .customPermissions(staff.getCustomPermissions())
                .effectivePermissions(effective)
                .status(staff.getStatus())
                .mustChangePassword(staff.isMustChangePassword())
                .createdBy(staff.getCreatedBy())
                .createdAt(staff.getCreatedAt())
                .updatedAt(staff.getUpdatedAt())
                .lastLoginAt(staff.getLastLoginAt())
                .build();
    }
}
