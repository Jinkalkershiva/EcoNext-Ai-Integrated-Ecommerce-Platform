package com.econext.admin.dto.response;

import com.econext.admin.entity.PermissionType;
import com.econext.admin.entity.StaffStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffResponse {
    private Long id;
    private String name;
    private String username;
    private String email;
    private String phone;
    private String roleName;
    private Set<PermissionType> customPermissions;
    private Set<PermissionType> effectivePermissions;
    private StaffStatus status;
    private boolean mustChangePassword;
    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime lastLoginAt;

    public String getFullName() {
        return this.name;
    }

    public java.util.List<String> getRoles() {
        return this.roleName != null ? java.util.List.of(this.roleName) : java.util.Collections.emptyList();
    }
}
