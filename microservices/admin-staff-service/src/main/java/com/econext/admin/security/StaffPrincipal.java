package com.econext.admin.security;

import com.econext.admin.entity.PermissionType;
import com.econext.admin.entity.StaffMember;
import com.econext.admin.entity.StaffStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.HashSet;
import java.util.Set;

@Getter
@AllArgsConstructor
public class StaffPrincipal implements UserDetails {

    private final Long id;
    private final String name;
    private final String username;
    private final String email;
    private final String password;
    private final String roleName;
    private final Set<PermissionType> permissions;
    private final StaffStatus status;
    private final Collection<? extends GrantedAuthority> authorities;

    public static StaffPrincipal create(StaffMember staff, Set<PermissionType> effectivePermissions) {
        Set<GrantedAuthority> authorities = new HashSet<>();
        
        // Add role authority e.g., ROLE_ADMIN, ROLE_INVENTORY_MANAGER
        String formattedRole = staff.getRoleName().toUpperCase();
        if (!formattedRole.startsWith("ROLE_")) {
            formattedRole = "ROLE_" + formattedRole;
        }
        authorities.add(new SimpleGrantedAuthority(formattedRole));

        // Add granular permission authorities
        if (effectivePermissions != null) {
            for (PermissionType permission : effectivePermissions) {
                authorities.add(new SimpleGrantedAuthority(permission.name()));
            }
        }

        return new StaffPrincipal(
                staff.getId(),
                staff.getName(),
                staff.getUsername(),
                staff.getEmail(),
                staff.getPasswordHash(),
                staff.getRoleName(),
                effectivePermissions,
                staff.getStatus(),
                authorities
        );
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return status != StaffStatus.SUSPENDED;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return status == StaffStatus.ACTIVE;
    }
}
