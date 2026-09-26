package com.econext.catalog.security;

import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;

import java.security.Principal;
import java.util.Collection;

@Getter
@AllArgsConstructor
public class OperationalStaffPrincipal implements Principal {
    private final Long id;
    private final String name;
    private final String username;
    private final String email;
    private final String role;
    private final Collection<? extends GrantedAuthority> authorities;

    @Override
    public String getName() {
        return username;
    }
}
