package com.econext.admin.security;

import com.econext.admin.entity.PermissionType;
import com.econext.admin.entity.RoleDefinition;
import com.econext.admin.entity.StaffMember;
import com.econext.admin.repository.RoleDefinitionRepository;
import com.econext.admin.repository.StaffMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class StaffUserDetailsService implements UserDetailsService {

    private final StaffMemberRepository staffRepository;
    private final RoleDefinitionRepository roleRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String usernameOrEmail) throws UsernameNotFoundException {
        StaffMember staff = staffRepository.findByUsername(usernameOrEmail)
                .or(() -> staffRepository.findByEmail(usernameOrEmail))
                .orElseThrow(() -> new UsernameNotFoundException("Staff member not found with identifier: " + usernameOrEmail));

        Set<PermissionType> effectivePermissions = resolveEffectivePermissions(staff);
        return StaffPrincipal.create(staff, effectivePermissions);
    }

    @Transactional(readOnly = true)
    public UserDetails loadUserById(Long id) {
        StaffMember staff = staffRepository.findById(id)
                .orElseThrow(() -> new UsernameNotFoundException("Staff member not found with ID: " + id));

        Set<PermissionType> effectivePermissions = resolveEffectivePermissions(staff);
        return StaffPrincipal.create(staff, effectivePermissions);
    }

    public Set<PermissionType> resolveEffectivePermissions(StaffMember staff) {
        if ("ROLE_ADMIN".equalsIgnoreCase(staff.getRoleName()) || "ADMIN".equalsIgnoreCase(staff.getRoleName())) {
            return new HashSet<>(Arrays.asList(PermissionType.values()));
        }

        Set<PermissionType> permissions = new HashSet<>();
        
        // Add role-based permissions
        Optional<RoleDefinition> roleDef = roleRepository.findByName(staff.getRoleName());
        roleDef.ifPresent(r -> permissions.addAll(r.getPermissions()));

        // Add direct custom permissions assigned to this staff member
        if (staff.getCustomPermissions() != null) {
            permissions.addAll(staff.getCustomPermissions());
        }

        return permissions;
    }
}
