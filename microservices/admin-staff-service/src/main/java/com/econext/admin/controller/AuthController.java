package com.econext.admin.controller;

import com.econext.admin.dto.request.LoginRequest;
import com.econext.admin.dto.request.TokenRefreshRequest;
import com.econext.admin.dto.response.ApiResponse;
import com.econext.admin.dto.response.AuthResponse;
import com.econext.admin.security.StaffPrincipal;
import com.econext.admin.service.AdminAuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/auth")
@RequiredArgsConstructor
@Tag(name = "Admin & Staff Authentication", description = "Endpoints for Admin/Staff login, session refresh and profile inspection")
public class AuthController {

    private final AdminAuthService authService;

    @PostMapping("/login")
    @Operation(summary = "Authenticate Admin or Staff member with credentials")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest
    ) {
        String ip = httpRequest.getRemoteAddr();
        AuthResponse response = authService.login(request, ip);
        return ResponseEntity.ok(ApiResponse.ok("Login successful", response));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Refresh expired JWT access token using valid refresh token")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(@Valid @RequestBody TokenRefreshRequest request) {
        AuthResponse response = authService.refreshToken(request);
        return ResponseEntity.ok(ApiResponse.ok("Token refreshed successfully", response));
    }

    @GetMapping("/me")
    @Operation(summary = "Get current authenticated staff / admin profile and effective permissions")
    public ResponseEntity<ApiResponse<AuthResponse>> getCurrentProfile(@AuthenticationPrincipal StaffPrincipal principal) {
        AuthResponse profile = authService.getCurrentStaffProfile(principal);
        return ResponseEntity.ok(ApiResponse.ok(profile));
    }

    @GetMapping("/init-check")
    @Operation(summary = "Check service health and bootstrap state")
    public ResponseEntity<ApiResponse<String>> initCheck() {
        return ResponseEntity.ok(ApiResponse.ok("Admin & Staff Service active"));
    }
}
