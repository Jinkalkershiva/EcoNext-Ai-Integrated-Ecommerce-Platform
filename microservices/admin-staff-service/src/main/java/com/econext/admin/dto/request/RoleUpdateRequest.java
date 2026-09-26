package com.econext.admin.dto.request;

import com.econext.admin.entity.PermissionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoleUpdateRequest {
    private String description;
    private Set<PermissionType> permissions;
}
