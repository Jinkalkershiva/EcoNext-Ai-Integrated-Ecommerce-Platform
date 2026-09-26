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
    @NotBlank(message = "Staff full name is required")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    private String phone;

    private String roleName;

    private Set<PermissionType> customPermissions;

    private StaffStatus status;
}
