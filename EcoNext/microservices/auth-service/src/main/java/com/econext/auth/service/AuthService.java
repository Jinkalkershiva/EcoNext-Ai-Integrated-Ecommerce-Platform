package com.econext.auth.service;

import com.econext.auth.dto.request.LoginRequest;
import com.econext.auth.dto.request.LogoutRequest;
import com.econext.auth.dto.request.RefreshTokenRequest;
import com.econext.auth.dto.request.SignUpRequest;
import com.econext.auth.dto.response.AuthResponse;
import com.econext.auth.dto.response.TokenResponse;
import com.econext.auth.entity.User;
import com.econext.auth.entity.UserProfile;
import com.econext.auth.exception.BadRequestException;
import com.econext.auth.exception.DuplicateResourceException;
import com.econext.auth.exception.UnauthorizedException;
import com.econext.auth.mapper.UserMapper;
import com.econext.auth.repository.UserProfileRepository;
import com.econext.auth.repository.UserRepository;
import com.econext.auth.security.JwtTokenProvider;
import com.econext.auth.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final UserMapper userMapper;

    @Transactional
    public AuthResponse register(SignUpRequest request) {
        log.info("Processing user registration for username: {}", request.getUsername());

        // Validate password confirmation if provided
        if (StringUtils.hasText(request.getPasswordConfirm()) && !request.getPassword().equals(request.getPasswordConfirm())) {
            throw new BadRequestException("Passwords do not match");
        }

        // Validate username uniqueness (case-insensitive)
        if (userRepository.existsByUsernameIgnoreCase(request.getUsername())) {
            throw new DuplicateResourceException("Username already exists");
        }

        // Validate email uniqueness (case-insensitive)
        if (userRepository.existsByEmailIgnoreCase(request.getEmail())) {
            throw new DuplicateResourceException("Email already exists");
        }

        String firstName = request.getFirstName() != null ? request.getFirstName() : "";
        String lastName = request.getLastName() != null ? request.getLastName() : "";

        // Create User entity
        User user = User.builder()
                .username(request.getUsername().trim())
                .email(request.getEmail().trim().toLowerCase())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .firstName(firstName)
                .lastName(lastName)
                .role("ROLE_USER")
                .active(true)
                .build();

        User savedUser = userRepository.save(user);

        // Create default UserProfile entity
        UserProfile profile = UserProfile.builder()
                .user(savedUser)
                .phone("")
                .address("")
                .city("")
                .state("")
                .zipcode("")
                .country("")
                .preferences("{}")
                .build();

        userProfileRepository.save(profile);
        savedUser.setProfile(profile);

        // Generate JWT tokens
        UserPrincipal userPrincipal = UserPrincipal.create(savedUser);
        String accessToken = tokenProvider.generateAccessToken(userPrincipal);
        String refreshToken = tokenProvider.generateRefreshToken(userPrincipal);

        return AuthResponse.builder()
                .status("success")
                .message("User registered successfully")
                .user(userMapper.toUserDto(savedUser))
                .tokens(TokenResponse.builder()
                        .access(accessToken)
                        .refresh(refreshToken)
                        .build())
                .build();
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        log.info("Processing user login for: {}", request.getUsername());

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();

            User user = userRepository.findById(userPrincipal.getId())
                    .orElseThrow(() -> new UnauthorizedException("Invalid username or password"));

            UserProfile profile = userProfileRepository.findByUser(user)
                    .orElseGet(() -> userProfileRepository.save(UserProfile.builder().user(user).build()));

            String accessToken = tokenProvider.generateAccessToken(userPrincipal);
            String refreshToken = tokenProvider.generateRefreshToken(userPrincipal);

            return AuthResponse.builder()
                .status("success")
                .message("Login successful")
                .user(userMapper.toUserDto(user))
                .profile(userMapper.toUserProfileDto(profile))
                .tokens(TokenResponse.builder()
                        .access(accessToken)
                        .refresh(refreshToken)
                        .build())
                .build();
        } catch (BadCredentialsException ex) {
            log.warn("Login failed for {}: Bad credentials", request.getUsername());
            throw new UnauthorizedException("Invalid username or password");
        }
    }

    @Transactional(readOnly = true)
    public TokenResponse refreshToken(RefreshTokenRequest request) {
        String refreshToken = request.getRefresh();

        if (!tokenProvider.validateToken(refreshToken)) {
            throw new UnauthorizedException("Invalid or expired refresh token");
        }

        String username = tokenProvider.getUsernameFromToken(refreshToken);
        User user = userRepository.findByUsernameIgnoreCase(username)
                .orElseThrow(() -> new UnauthorizedException("User not found for provided token"));

        UserPrincipal userPrincipal = UserPrincipal.create(user);
        String newAccessToken = tokenProvider.generateAccessToken(userPrincipal);
        String newRefreshToken = tokenProvider.generateRefreshToken(userPrincipal);

        return TokenResponse.builder()
                .access(newAccessToken)
                .refresh(newRefreshToken)
                .build();
    }

    public AuthResponse logout(LogoutRequest request) {
        log.info("User logout requested - client will discard access and refresh tokens");
        return AuthResponse.builder()
                .status("success")
                .message("Logout successful")
                .build();
    }
}
