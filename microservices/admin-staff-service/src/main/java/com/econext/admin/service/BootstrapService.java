package com.econext.admin.service;

import com.econext.admin.entity.PermissionType;
import com.econext.admin.entity.RoleDefinition;
import com.econext.admin.entity.StaffMember;
import com.econext.admin.entity.StaffStatus;
import com.econext.admin.repository.RoleDefinitionRepository;
import com.econext.admin.repository.StaffMemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class BootstrapService implements CommandLineRunner {

    private final RoleDefinitionRepository roleRepository;
    private final StaffMemberRepository staffRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.initial-username:admin}")
    private String initialAdminUsername;

    @Value("${app.admin.initial-password:Admin@12345}")
    private String initialAdminPassword;

    @Value("${app.admin.initial-email:admin@econext.com}")
    private String initialAdminEmail;

    @Override
    @Transactional
    public void run(String... args) {
        log.info("Checking baseline system roles and root administrator account...");
        initializeSystemRoles();
        initializeRootAdmin();
    }

    private void initializeSystemRoles() {
        createRoleIfNotExists(
                "ROLE_ADMIN",
                "Full System Administrator with unrestricted access",
                new HashSet<>(Arrays.asList(PermissionType.values())),
                true
        );

        createRoleIfNotExists(
                "INVENTORY_MANAGER",
                "Manages stock inventory, adjustments, thresholds, and low-stock alerts",
                Set.of(
                        PermissionType.INVENTORY_CREATE,
                        PermissionType.INVENTORY_READ,
                        PermissionType.INVENTORY_UPDATE,
                        PermissionType.INVENTORY_ADJUST,
                        PermissionType.CATALOG_READ,
                        PermissionType.DATA_IMPORT,
                        PermissionType.DATA_EXPORT
                ),
                true
        );

        createRoleIfNotExists(
                "CATALOG_MANAGER",
                "Manages products, categories, pricing, attributes, and catalog data entry",
                Set.of(
                        PermissionType.CATALOG_CREATE,
                        PermissionType.CATALOG_READ,
                        PermissionType.CATALOG_UPDATE,
                        PermissionType.CATALOG_DELETE,
                        PermissionType.INVENTORY_READ,
                        PermissionType.DATA_IMPORT,
                        PermissionType.DATA_EXPORT
                ),
                true
        );

        createRoleIfNotExists(
                "ORDER_MANAGER",
                "Supervises order processing, lifecycle states, cancellations, and logistics",
                Set.of(
                        PermissionType.ORDER_READ,
                        PermissionType.ORDER_UPDATE,
                        PermissionType.ORDER_PROCESS,
                        PermissionType.ORDER_STATUS_UPDATE,
                        PermissionType.CATALOG_READ,
                        PermissionType.INVENTORY_READ
                ),
                true
        );

        createRoleIfNotExists(
                "ORDER_PROCESSING_STAFF",
                "Handles daily picking, packing, and shipment dispatch transitions",
                Set.of(
                        PermissionType.ORDER_READ,
                        PermissionType.ORDER_PROCESS,
                        PermissionType.ORDER_STATUS_UPDATE,
                        PermissionType.CATALOG_READ
                ),
                true
        );

        createRoleIfNotExists(
                "DATA_ANALYST",
                "Accesses reports, operational analytics, sales aggregations, and data exports",
                Set.of(
                        PermissionType.DATA_ANALYSIS,
                        PermissionType.DATA_EXPORT,
                        PermissionType.CATALOG_READ,
                        PermissionType.INVENTORY_READ,
                        PermissionType.ORDER_READ,
                        PermissionType.AUDIT_READ
                ),
                true
        );

        createRoleIfNotExists(
                "DATA_ENTRY_STAFF",
                "Performs manual product creation and batch CSV/Excel data entry",
                Set.of(
                        PermissionType.CATALOG_CREATE,
                        PermissionType.CATALOG_READ,
                        PermissionType.CATALOG_UPDATE,
                        PermissionType.DATA_IMPORT
                ),
                true
        );

        createRoleIfNotExists(
                "DELIVERY_STAFF",
                "Field and dispatch logistics updates (Out for delivery, Delivered)",
                Set.of(
                        PermissionType.ORDER_READ,
                        PermissionType.ORDER_STATUS_UPDATE
                ),
                true
        );
    }

    private void createRoleIfNotExists(String roleName, String description, Set<PermissionType> permissions, boolean isSystemRole) {
        if (!roleRepository.existsByName(roleName)) {
            RoleDefinition role = RoleDefinition.builder()
                    .name(roleName)
                    .description(description)
                    .permissions(permissions)
                    .isSystemRole(isSystemRole)
                    .build();
            roleRepository.save(role);
            log.info("Provisioned baseline role: {}", roleName);
        }
    }

    private void initializeRootAdmin() {
        if (!staffRepository.existsByUsername(initialAdminUsername)) {
            boolean isDefaultDevPassword = "Admin@12345".equals(initialAdminPassword);
            if (isDefaultDevPassword) {
                log.warn("SECURITY WARNING: Root admin initialized with default development password. Set ADMIN_INITIAL_PASSWORD environment variable in production and change password on first login.");
            }

            StaffMember admin = StaffMember.builder()
                    .name("EcoNext Administrator")
                    .username(initialAdminUsername)
                    .email(initialAdminEmail)
                    .phone("+91 99999 00000")
                    .passwordHash(passwordEncoder.encode(initialAdminPassword))
                    .roleName("ROLE_ADMIN")
                    .customPermissions(new HashSet<>(Arrays.asList(PermissionType.values())))
                    .status(StaffStatus.ACTIVE)
                    .mustChangePassword(isDefaultDevPassword)
                    .createdBy("SYSTEM_BOOTSTRAP")
                    .build();

            staffRepository.save(admin);
            log.info("Initialized root admin account [username: {}]", initialAdminUsername);
        }
    }
}
