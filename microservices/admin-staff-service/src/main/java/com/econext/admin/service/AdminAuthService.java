package com.econext.admin.service;

import com.econext.admin.dto.request.LoginRequest;
import com.econext.admin.dto.request.TokenRefreshRequest;
import com.econext.admin.dto.response.AuthResponse;
import com.econext.admin.entity.PermissionType;
import com.econext.admin.entity.StaffMember;
import com.econext.admin.entity.StaffStatus;
import com.econext.admin.exception.BadRequestException;
import com.econext.admin.exception.UnauthorizedException;
import com.econext.admin.repository.StaffMemberRepository;
import com.econext.admin.security.JwtTokenProvider;
import com.econext.admin.security.StaffPrincipal;
import com.econext.admin.security.StaffUserDetailsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminAuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final StaffMemberRepository staffRepository;
    private final StaffUserDetailsService userDetailsService;
    private final AuditService auditService;

    @Transactional
    public AuthResponse login(LoginRequest request, String ipAddress) {
        StaffMember staff = staffRepository.findByUsername(request.getUsername())
                .or(() -> staffRepository.findByEmail(request.getUsername()))
                .orElseThrow(() -> new UnauthorizedException("Invalid credentials"));

        if (staff.getStatus() == StaffStatus.INACTIVE) {
            throw new UnauthorizedException("Your account is currently inactive. Contact system administrator.");
        }
        if (staff.getStatus() == StaffStatus.SUSPENDED) {
            throw new UnauthorizedException("Your account has been suspended. Access denied.");
        }

        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
            );
        } catch (org.springframework.security.core.AuthenticationException e) {
            throw new UnauthorizedException("Invalid credentials");
        }

        SecurityContextHolder.getContext().setAuthentication(authentication);

        StaffPrincipal principal = (StaffPrincipal) authentication.getPrincipal();
        String accessToken = tokenProvider.generateAccessToken(principal);
        String refreshToken = tokenProvider.generateRefreshToken(principal);

        staff.setLastLoginAt(LocalDateTime.now());
        staffRepository.save(staff);

        // Record audit event for login
        auditService.recordAudit(
                staff.getId(),
                staff.getUsername(),
                staff.getRoleName(),
                "STAFF_LOGIN",
                "AUTH",
                staff.getId().toString(),
                "Successful login for " + staff.getRoleName() + " (" + staff.getUsername() + ")",
                ipAddress
        );

        Set<PermissionType> effectivePermissions = userDetailsService.resolveEffectivePermissions(staff);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(tokenProvider.getExpirationMs())
                .id(staff.getId())
                .name(staff.getName())
                .username(staff.getUsername())
                .email(staff.getEmail())
                .role(staff.getRoleName())
                .mustChangePassword(staff.isMustChangePassword())
                .permissions(effectivePermissions)
                .build();
    }

    @Transactional(readOnly = true)
    public AuthResponse refreshToken(TokenRefreshRequest request) {
        String refreshToken = request.getRefreshToken();
        if (!tokenProvider.validateToken(refreshToken)) {
            throw new BadRequestException("Invalid or expired refresh token");
        }

        Long userId = tokenProvider.getUserIdFromToken(refreshToken);
        StaffMember staff = staffRepository.findById(userId)
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        if (staff.getStatus() != StaffStatus.ACTIVE) {
            throw new UnauthorizedException("Account is not active");
        }

        Set<PermissionType> effectivePermissions = userDetailsService.resolveEffectivePermissions(staff);
        StaffPrincipal principal = StaffPrincipal.create(staff, effectivePermissions);

        String newAccessToken = tokenProvider.generateAccessToken(principal);
        String newRefreshToken = tokenProvider.generateRefreshToken(principal);

        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .tokenType("Bearer")
                .expiresIn(tokenProvider.getExpirationMs())
                .id(staff.getId())
                .name(staff.getName())
                .username(staff.getUsername())
                .email(staff.getEmail())
                .role(staff.getRoleName())
                .mustChangePassword(staff.isMustChangePassword())
                .permissions(effectivePermissions)
                .build();
    }

    @Transactional(readOnly = true)
    public AuthResponse getCurrentStaffProfile(StaffPrincipal principal) {
        StaffMember staff = staffRepository.findById(principal.getId())
                .orElseThrow(() -> new UnauthorizedException("Staff profile not found"));

        Set<PermissionType> effectivePermissions = userDetailsService.resolveEffectivePermissions(staff);

        return AuthResponse.builder()
                .id(staff.getId())
                .name(staff.getName())
                .username(staff.getUsername())
                .email(staff.getEmail())
                .role(staff.getRoleName())
                .mustChangePassword(staff.isMustChangePassword())
                .permissions(effectivePermissions)
                .build();
    }
}
