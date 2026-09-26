package com.econext.auth.controller;

import com.econext.auth.dto.request.LoginRequest;
import com.econext.auth.dto.request.LogoutRequest;
import com.econext.auth.dto.request.RefreshTokenRequest;
import com.econext.auth.dto.request.SignUpRequest;
import com.econext.auth.dto.response.AuthResponse;
import com.econext.auth.dto.response.TokenResponse;
import com.econext.auth.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping({"/signup", "/signup/", "/register", "/register/"})
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody SignUpRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping({"/login", "/login/", "/signin", "/signin/"})
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping({"/refresh", "/refresh/"})
    public ResponseEntity<TokenResponse> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
        TokenResponse response = authService.refreshToken(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping({"/logout", "/logout/"})
    public ResponseEntity<AuthResponse> logout(@RequestBody(required = false) LogoutRequest request) {
        LogoutRequest safeRequest = request != null ? request : new LogoutRequest();
        AuthResponse response = authService.logout(safeRequest);
        return ResponseEntity.ok(response);
    }
}
