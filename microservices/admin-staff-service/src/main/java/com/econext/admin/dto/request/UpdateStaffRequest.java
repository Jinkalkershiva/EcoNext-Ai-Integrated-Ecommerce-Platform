package com.econext.admin.dto.request;

import com.econext.admin.entity.PermissionType;
import com.econext.admin.entity.StaffStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateStaffRequest {
    private String name;

    @Email(message = "Invalid email format")
    private String email;

    private String phone;

    private String roleName;

    private Set<PermissionType> customPermissions;

    private StaffStatus status;

    public void setFullName(String fullName) {
        if (this.name == null || this.name.isBlank()) {
            this.name = fullName;
        }
    }

    public void setRoles(java.util.List<String> roles) {
        if ((this.roleName == null || this.roleName.isBlank()) && roles != null && !roles.isEmpty()) {
            this.roleName = roles.get(0);
        }
    }
}
