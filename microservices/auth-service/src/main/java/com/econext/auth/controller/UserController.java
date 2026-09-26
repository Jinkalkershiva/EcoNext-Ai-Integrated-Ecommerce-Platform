package com.econext.auth.controller;

import com.econext.auth.dto.request.UpdateProfileRequest;
import com.econext.auth.dto.response.AuthResponse;
import com.econext.auth.dto.response.UserDto;
import com.econext.auth.security.UserPrincipal;
import com.econext.auth.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping({"/current-user", "/current-user/"})
    public ResponseEntity<AuthResponse> getCurrentUser(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        AuthResponse response = userService.getCurrentUser(userPrincipal);
        return ResponseEntity.ok(response);
    }

    @PutMapping({"/profile/update", "/profile/update/"})
    public ResponseEntity<AuthResponse> updateProfilePut(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        AuthResponse response = userService.updateProfile(userPrincipal, request);
        return ResponseEntity.ok(response);
    }

    @PatchMapping({"/profile/update", "/profile/update/"})
    public ResponseEntity<AuthResponse> updateProfilePatch(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestBody UpdateProfileRequest request
    ) {
        AuthResponse response = userService.updateProfile(userPrincipal, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<UserDto> getUserById(@PathVariable Long id) {
        UserDto userDto = userService.getUserById(id);
        return ResponseEntity.ok(userDto);
    }
}
