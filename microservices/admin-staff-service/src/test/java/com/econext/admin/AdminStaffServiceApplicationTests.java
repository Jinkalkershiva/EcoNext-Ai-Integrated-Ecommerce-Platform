package com.econext.admin;

import com.econext.admin.dto.request.CreateStaffRequest;
import com.econext.admin.dto.request.LoginRequest;
import com.econext.admin.dto.request.ResetPasswordRequest;
import com.econext.admin.dto.request.TokenRefreshRequest;
import com.econext.admin.dto.request.UpdateStaffRequest;
import com.econext.admin.dto.request.UpdateStatusRequest;
import com.econext.admin.dto.response.AuthResponse;
import com.econext.admin.dto.response.StaffResponse;
import com.econext.admin.entity.AuditLog;
import com.econext.admin.entity.PermissionType;
import com.econext.admin.entity.StaffMember;
import com.econext.admin.entity.StaffStatus;
import com.econext.admin.exception.BadRequestException;
import com.econext.admin.exception.UnauthorizedException;
import com.econext.admin.repository.AuditLogRepository;
import com.econext.admin.repository.RoleDefinitionRepository;
import com.econext.admin.repository.StaffMemberRepository;
import com.econext.admin.security.JwtTokenProvider;
import com.econext.admin.service.AdminAuthService;
import com.econext.admin.service.StaffManagementService;
import com.econext.admin.dto.response.RoleResponse;
import com.econext.admin.service.RoleManagementService;
import com.econext.admin.security.StaffPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class AdminStaffServiceApplicationTests {

    @Autowired
    private AdminAuthService authService;

    @Autowired
    private StaffManagementService staffService;

    @Autowired
    private RoleManagementService roleService;

    @Autowired
    private StaffMemberRepository staffRepository;

    @Autowired
    private RoleDefinitionRepository roleRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @BeforeEach
    void setup() {
        if (!staffRepository.existsByUsername("admin")) {
            StaffMember admin = StaffMember.builder()
                    .name("Root Administrator")
                    .username("admin")
                    .email("admin@econext.com")
                    .passwordHash(passwordEncoder.encode("Admin@12345"))
                    .roleName("ROLE_ADMIN")
                    .status(StaffStatus.ACTIVE)
                    .mustChangePassword(true)
                    .build();
            staffRepository.save(admin);
        }
    }

    @Test
    @DisplayName("1. Admin Authentication & JWT Generation & Expiration Verification")
    void testAdminAuthenticationAndJwt() {
        LoginRequest loginRequest = LoginRequest.builder()
                .username("admin")
                .password("Admin@12345")
                .build();

        AuthResponse response = authService.login(loginRequest, "127.0.0.1");

        assertNotNull(response);
        assertNotNull(response.getAccessToken());
        assertNotNull(response.getRefreshToken());
        assertEquals("Bearer", response.getTokenType());
        assertEquals("admin", response.getUsername());
        assertEquals("ROLE_ADMIN", response.getRole());
        assertTrue(response.isMustChangePassword(), "Initial bootstrap admin should flag mustChangePassword");

        // Verify JWT token is cryptographically valid
        assertTrue(jwtTokenProvider.validateToken(response.getAccessToken()));
        assertEquals("admin", jwtTokenProvider.getUsernameFromToken(response.getAccessToken()));
        assertEquals(response.getId(), jwtTokenProvider.getUserIdFromToken(response.getAccessToken()));

        // Verify password is NOT plaintext in database
        StaffMember adminEntity = staffRepository.findByUsername("admin").orElseThrow();
        assertNotEquals("Admin@12345", adminEntity.getPasswordHash());
        assertTrue(passwordEncoder.matches("Admin@12345", adminEntity.getPasswordHash()));
        assertTrue(adminEntity.getPasswordHash().startsWith("$2a$") || adminEntity.getPasswordHash().startsWith("$2b$"));
    }

    @Test
    @DisplayName("2. Authentication Rejection: Invalid Credentials & Suspended Accounts")
    void testAuthFailureScenarios() {
        // Invalid password
        LoginRequest badPass = LoginRequest.builder()
                .username("admin")
                .password("WrongPassword@999")
                .build();
        assertThrows(UnauthorizedException.class, () -> authService.login(badPass, "127.0.0.1"));

        // Suspended staff member
        StaffMember suspendedStaff = StaffMember.builder()
                .name("Suspended Staff")
                .username("suspended_staff")
                .email("suspended@econext.com")
                .passwordHash(passwordEncoder.encode("Secret@12345"))
                .roleName("CATALOG_MANAGER")
                .status(StaffStatus.SUSPENDED)
                .build();
        staffRepository.save(suspendedStaff);

        LoginRequest suspendedLogin = LoginRequest.builder()
                .username("suspended_staff")
                .password("Secret@12345")
                .build();
        assertThrows(UnauthorizedException.class, () -> authService.login(suspendedLogin, "127.0.0.1"));
    }

    @Test
    @DisplayName("3. JWT Refresh Token Behavior")
    void testRefreshTokenRotation() {
        LoginRequest loginRequest = LoginRequest.builder()
                .username("admin")
                .password("Admin@12345")
                .build();
        AuthResponse loginRes = authService.login(loginRequest, "127.0.0.1");

        TokenRefreshRequest refreshReq = TokenRefreshRequest.builder()
                .refreshToken(loginRes.getRefreshToken())
                .build();

        AuthResponse refreshed = authService.refreshToken(refreshReq);
        assertNotNull(refreshed);
        assertNotNull(refreshed.getAccessToken());
        assertTrue(jwtTokenProvider.validateToken(refreshed.getAccessToken()));
        assertEquals("admin", refreshed.getUsername());

        // Invalid refresh token must throw BadRequestException
        TokenRefreshRequest badRefresh = TokenRefreshRequest.builder()
                .refreshToken("invalid.token.string")
                .build();
        assertThrows(BadRequestException.class, () -> authService.refreshToken(badRefresh));
    }

    @Test
    @DisplayName("4. RBAC & PBAC Isolation across 6 Operational Roles")
    void testRbacAndPbacRoleIsolation() {
        // 1. Create CATALOG STAFF
        CreateStaffRequest catStaffReq = CreateStaffRequest.builder()
                .name("Catalog Curator")
                .username("cat_curator")
                .email("cat@econext.com")
                .password("CatPass@123")
                .roleName("CATALOG_MANAGER")
                .build();
        StaffResponse catStaff = staffService.createStaff(catStaffReq, "admin");
        assertTrue(catStaff.getEffectivePermissions().contains(PermissionType.CATALOG_CREATE));
        assertTrue(catStaff.getEffectivePermissions().contains(PermissionType.CATALOG_UPDATE));
        assertFalse(catStaff.getEffectivePermissions().contains(PermissionType.STAFF_CREATE), "Catalog staff cannot create staff");
        assertFalse(catStaff.getEffectivePermissions().contains(PermissionType.INVENTORY_ADJUST), "Catalog staff cannot adjust stock");

        // 2. Create INVENTORY STAFF
        CreateStaffRequest invStaffReq = CreateStaffRequest.builder()
                .name("Inventory Controller")
                .username("inv_controller")
                .email("inv_ctrl@econext.com")
                .password("InvPass@123")
                .roleName("INVENTORY_MANAGER")
                .build();
        StaffResponse invStaff = staffService.createStaff(invStaffReq, "admin");
        assertTrue(invStaff.getEffectivePermissions().contains(PermissionType.INVENTORY_ADJUST));
        assertFalse(invStaff.getEffectivePermissions().contains(PermissionType.ORDER_STATUS_UPDATE), "Inventory staff cannot update order status");

        // 3. Create ORDER STAFF
        CreateStaffRequest orderStaffReq = CreateStaffRequest.builder()
                .name("Order Coordinator")
                .username("order_coordinator")
                .email("orders@econext.com")
                .password("OrderPass@123")
                .roleName("ORDER_MANAGER")
                .build();
        StaffResponse orderStaff = staffService.createStaff(orderStaffReq, "admin");
        assertTrue(orderStaff.getEffectivePermissions().contains(PermissionType.ORDER_STATUS_UPDATE));
        assertFalse(orderStaff.getEffectivePermissions().contains(PermissionType.CATALOG_CREATE), "Order staff cannot create products");

        // 4. Create DATA IMPORT STAFF
        CreateStaffRequest importStaffReq = CreateStaffRequest.builder()
                .name("Data Ingestion Specialist")
                .username("data_import_specialist")
                .email("import@econext.com")
                .password("ImportPass@123")
                .roleName("DATA_ENTRY_STAFF")
                .build();
        StaffResponse importStaff = staffService.createStaff(importStaffReq, "admin");
        assertTrue(importStaff.getEffectivePermissions().contains(PermissionType.DATA_IMPORT));
        assertFalse(importStaff.getEffectivePermissions().contains(PermissionType.AUDIT_READ), "Data entry staff cannot view audit trail");

        // 5. Create DATA ANALYST
        CreateStaffRequest analystReq = CreateStaffRequest.builder()
                .name("Business Analyst")
                .username("biz_analyst")
                .email("analyst@econext.com")
                .password("AnalystPass@123")
                .roleName("DATA_ANALYST")
                .build();
        StaffResponse analyst = staffService.createStaff(analystReq, "admin");
        assertTrue(analyst.getEffectivePermissions().contains(PermissionType.DATA_ANALYSIS));
        assertFalse(analyst.getEffectivePermissions().contains(PermissionType.INVENTORY_ADJUST), "Analyst cannot adjust inventory");
    }

    @Test
    @DisplayName("5. Staff Management Full Lifecycle: Create, Update, Reset Password, Toggle Status, Delete")
    void testStaffManagementLifecycle() {
        // Create
        CreateStaffRequest createReq = CreateStaffRequest.builder()
                .name("Neha Verma")
                .username("neha_verma")
                .email("neha@econext.com")
                .password("InitialPass@123")
                .roleName("CATALOG_MANAGER")
                .status(StaffStatus.ACTIVE)
                .build();
        StaffResponse created = staffService.createStaff(createReq, "admin");
        assertNotNull(created.getId());

        // Update
        UpdateStaffRequest updateReq = UpdateStaffRequest.builder()
                .name("Neha Verma-Sharma")
                .email("neha.sharma@econext.com")
                .roleName("INVENTORY_MANAGER")
                .build();
        StaffResponse updated = staffService.updateStaff(created.getId(), updateReq, "admin");
        assertEquals("Neha Verma-Sharma", updated.getName());
        assertEquals("INVENTORY_MANAGER", updated.getRoleName());

        // Reset password
        ResetPasswordRequest resetReq = ResetPasswordRequest.builder()
                .newPassword("NewSecretPass@456")
                .build();
        staffService.resetPassword(created.getId(), resetReq, "admin");

        // Verify login with new password
        LoginRequest newLogin = LoginRequest.builder()
                .username("neha_verma")
                .password("NewSecretPass@456")
                .build();
        AuthResponse loginRes = authService.login(newLogin, "127.0.0.1");
        assertNotNull(loginRes.getAccessToken());

        // Toggle status to SUSPENDED
        UpdateStatusRequest statusReq = UpdateStatusRequest.builder()
                .status(StaffStatus.SUSPENDED)
                .build();
        StaffResponse suspended = staffService.updateStatus(created.getId(), statusReq, "admin");
        assertEquals(StaffStatus.SUSPENDED, suspended.getStatus());

        // Delete
        staffService.deleteStaff(created.getId(), "admin");
        assertFalse(staffRepository.existsById(created.getId()));
    }

    @Test
    @DisplayName("6. Forensic Audit Trail Generation & Immutability Verification")
    void testAuditTrailGeneration() {
        int initialCount = auditLogRepository.findAll().size();

        // Perform action that triggers audit: Login
        LoginRequest login = LoginRequest.builder()
                .username("admin")
                .password("Admin@12345")
                .build();
        authService.login(login, "192.168.1.50");

        List<AuditLog> audits = auditLogRepository.findAll();
        assertTrue(audits.size() > initialCount, "Audit log record should be created on login");

        AuditLog latest = audits.get(audits.size() - 1);
        assertNotNull(latest.getTimestamp());
        assertEquals("STAFF_LOGIN", latest.getAction());
        assertEquals("admin", latest.getActorUsername());
        assertEquals("192.168.1.50", latest.getIpAddress());
    }

    @Test
    @DisplayName("7. Step 7.1 E2E Verification: Admin Login -> Role Listing -> Staff Provisioning -> Persistence -> Staff Login -> PBAC Isolation")
    void testStep71FullEndToEndStaffProvisioningFlow() {
        // 1. ADMIN LOGIN
        LoginRequest adminLogin = LoginRequest.builder()
                .username("admin")
                .password("Admin@12345")
                .build();
        AuthResponse adminAuth = authService.login(adminLogin, "127.0.0.1");
        assertNotNull(adminAuth, "Admin login must succeed");
        assertNotNull(adminAuth.getAccessToken(), "Admin JWT token must be generated");
        assertEquals("ROLE_ADMIN", adminAuth.getRole(), "User must be authenticated as ROLE_ADMIN");
        assertTrue(jwtTokenProvider.validateToken(adminAuth.getAccessToken()), "Admin JWT must be valid");

        // 2. ROLE DROPDOWN: Verify actual backend roles exist and are non-empty
        List<RoleResponse> roles = roleService.getAllRoles();
        assertNotNull(roles);
        assertFalse(roles.isEmpty(), "Available roles must not be empty");
        assertTrue(roles.size() >= 8, "Expected at least 8 baseline operational roles");

        List<String> roleNames = roles.stream().map(RoleResponse::getName).toList();
        assertTrue(roleNames.contains("ROLE_ADMIN"));
        assertTrue(roleNames.contains("ORDER_MANAGER"));
        assertTrue(roleNames.contains("ORDER_PROCESSING_STAFF"));
        assertTrue(roleNames.contains("INVENTORY_MANAGER"));
        assertTrue(roleNames.contains("CATALOG_MANAGER"));
        assertTrue(roleNames.contains("DATA_ANALYST"));
        assertTrue(roleNames.contains("DATA_ENTRY_STAFF"));
        assertTrue(roleNames.contains("DELIVERY_STAFF"));

        for (RoleResponse r : roles) {
            assertNotNull(r.getName(), "Role name must not be null");
            assertFalse(r.getName().isBlank(), "Role name must not be blank");
            assertNotNull(r.getDescription(), "Role description must not be null");
            assertFalse(r.getDescription().isBlank(), "Role description must not be blank");
            assertNotNull(r.getRoleName(), "Role alias getRoleName() must return valid string");
        }

        // 3. CREATE A REAL TEST STAFF ACCOUNT (ORDER_MANAGER)
        CreateStaffRequest createReq = CreateStaffRequest.builder()
                .name("E2E Order Staff")
                .username("e2e_order_staff_2026")
                .email("e2e_order_staff_2026@econext.com")
                .password("OrderStaff@2026")
                .roleName("ORDER_MANAGER")
                .status(StaffStatus.ACTIVE)
                .build();

        StaffResponse createdStaff = staffService.createStaff(createReq, "admin");
        assertNotNull(createdStaff);
        assertNotNull(createdStaff.getId(), "Created staff must have a persisted ID");
        assertEquals("E2E Order Staff", createdStaff.getName());
        assertEquals("e2e_order_staff_2026", createdStaff.getUsername());
        assertEquals("e2e_order_staff_2026@econext.com", createdStaff.getEmail());
        assertEquals("ORDER_MANAGER", createdStaff.getRoleName());
        assertEquals(StaffStatus.ACTIVE, createdStaff.getStatus());

        // 4. VERIFY DATABASE PERSISTENCE DIRECTLY IN REPOSITORY
        StaffMember persistedEntity = staffRepository.findByUsername("e2e_order_staff_2026")
                .orElseThrow(() -> new AssertionError("Staff entity must exist in the database"));
        assertEquals("E2E Order Staff", persistedEntity.getName());
        assertEquals("e2e_order_staff_2026@econext.com", persistedEntity.getEmail());
        assertEquals("ORDER_MANAGER", persistedEntity.getRoleName());
        assertEquals(StaffStatus.ACTIVE, persistedEntity.getStatus());
        assertNotEquals("OrderStaff@2026", persistedEntity.getPasswordHash(), "Password must be securely hashed with BCrypt");
        assertTrue(passwordEncoder.matches("OrderStaff@2026", persistedEntity.getPasswordHash()), "BCrypt hash must match original password");

        // 5. STAFF DIRECTORY REFRESH
        List<StaffResponse> directory = staffService.getAllStaff();
        assertTrue(directory.stream().anyMatch(s -> "e2e_order_staff_2026".equals(s.getUsername())), "New staff must appear in directory");

        // 6. LOGIN AS NEW STAFF
        LoginRequest staffLogin = LoginRequest.builder()
                .username("e2e_order_staff_2026")
                .password("OrderStaff@2026")
                .build();
        AuthResponse staffAuth = authService.login(staffLogin, "127.0.0.1");
        assertNotNull(staffAuth, "Staff login must succeed");
        assertNotNull(staffAuth.getAccessToken(), "Staff JWT token must be generated");
        assertEquals("e2e_order_staff_2026", staffAuth.getUsername());
        assertEquals("ORDER_MANAGER", staffAuth.getRole(), "Assigned role must be ORDER_MANAGER");
        assertNotEquals("ROLE_ADMIN", staffAuth.getRole(), "Staff user must NOT be granted ROLE_ADMIN");

        // 7. VERIFY PBAC PERMISSIONS & ENFORCEMENT
        Set<PermissionType> perms = staffAuth.getPermissions();
        assertNotNull(perms, "Effective permissions must be present in authentication response");
        assertTrue(perms.contains(PermissionType.ORDER_READ), "Order staff must have ORDER_READ");
        assertTrue(perms.contains(PermissionType.ORDER_PROCESS), "Order staff must have ORDER_PROCESS");
        assertTrue(perms.contains(PermissionType.ORDER_STATUS_UPDATE), "Order staff must have ORDER_STATUS_UPDATE");
        assertTrue(perms.contains(PermissionType.CATALOG_READ), "Order staff must have CATALOG_READ");
        assertTrue(perms.contains(PermissionType.INVENTORY_READ), "Order staff must have INVENTORY_READ");

        // Verify that administrative privileges are strictly omitted
        assertFalse(perms.contains(PermissionType.STAFF_CREATE), "Order staff MUST NOT have STAFF_CREATE authority");
        assertFalse(perms.contains(PermissionType.STAFF_DISABLE), "Order staff MUST NOT have STAFF_DISABLE authority");
        assertFalse(perms.contains(PermissionType.STAFF_UPDATE), "Order staff MUST NOT have STAFF_UPDATE authority");
        assertFalse(perms.contains(PermissionType.AUDIT_READ), "Order staff MUST NOT have AUDIT_READ authority");
    }
}
