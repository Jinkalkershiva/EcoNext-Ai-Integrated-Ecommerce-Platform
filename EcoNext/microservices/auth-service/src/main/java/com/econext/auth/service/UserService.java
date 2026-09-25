package com.econext.auth.service;

import com.econext.auth.dto.request.UpdateProfileRequest;
import com.econext.auth.dto.response.AuthResponse;
import com.econext.auth.dto.response.UserDto;
import com.econext.auth.entity.User;
import com.econext.auth.entity.UserProfile;
import com.econext.auth.exception.DuplicateResourceException;
import com.econext.auth.exception.ResourceNotFoundException;
import com.econext.auth.mapper.UserMapper;
import com.econext.auth.repository.UserProfileRepository;
import com.econext.auth.repository.UserRepository;
import com.econext.auth.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final UserMapper userMapper;

    @Transactional(readOnly = true)
    public AuthResponse getCurrentUser(UserPrincipal userPrincipal) {
        User user = userRepository.findById(userPrincipal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userPrincipal.getId()));

        UserProfile profile = userProfileRepository.findByUser(user)
                .orElseGet(() -> userProfileRepository.save(UserProfile.builder().user(user).build()));

        return AuthResponse.builder()
                .status("success")
                .user(userMapper.toUserDto(user))
                .profile(userMapper.toUserProfileDto(profile))
                .build();
    }

    @Transactional
    public AuthResponse updateProfile(UserPrincipal userPrincipal, UpdateProfileRequest request) {
        log.info("Updating profile for user id: {}", userPrincipal.getId());

        User user = userRepository.findById(userPrincipal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userPrincipal.getId()));

        UserProfile profile = userProfileRepository.findByUser(user)
                .orElseGet(() -> userProfileRepository.save(UserProfile.builder().user(user).build()));

        // Guard email uniqueness
        if (StringUtils.hasText(request.getEmail()) && !request.getEmail().equalsIgnoreCase(user.getEmail())) {
            String newEmail = request.getEmail().trim().toLowerCase();
            if (userRepository.existsByEmailIgnoreCase(newEmail)) {
                throw new DuplicateResourceException("That email address is already in use.");
            }
            user.setEmail(newEmail);
        }

        if (request.getFirstName() != null) {
            user.setFirstName(request.getFirstName());
        }
        if (request.getLastName() != null) {
            user.setLastName(request.getLastName());
        }
        userRepository.save(user);

        if (request.getPhone() != null) {
            profile.setPhone(request.getPhone());
        }
        if (request.getAddress() != null) {
            profile.setAddress(request.getAddress());
        }
        if (request.getCity() != null) {
            profile.setCity(request.getCity());
        }
        if (request.getState() != null) {
            profile.setState(request.getState());
        }
        if (request.getZipcode() != null) {
            profile.setZipcode(request.getZipcode());
        }
        if (request.getCountry() != null) {
            profile.setCountry(request.getCountry());
        }
        userProfileRepository.save(profile);

        return AuthResponse.builder()
                .status("success")
                .message("Profile updated successfully")
                .user(userMapper.toUserDto(user))
                .profile(userMapper.toUserProfileDto(profile))
                .build();
    }

    @Transactional(readOnly = true)
    public UserDto getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        return userMapper.toUserDto(user);
    }
}
