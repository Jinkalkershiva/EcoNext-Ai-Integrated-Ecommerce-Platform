package com.econext.admin.dto.response;

import com.econext.admin.entity.PermissionType;
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
public class RoleResponse {
    private Long id;
    private String name;
    private String description;
    private Set<PermissionType> permissions;
    private Boolean isSystemRole;
    private Long staffCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public String getRoleName() {
        return this.name;
    }
}
