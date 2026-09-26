package com.econext.auth.mapper;

import com.econext.auth.dto.response.UserDto;
import com.econext.auth.dto.response.UserProfileDto;
import com.econext.auth.entity.User;
import com.econext.auth.entity.UserProfile;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

    public UserDto toUserDto(User user) {
        if (user == null) {
            return null;
        }
        return UserDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .role(user.getRole())
                .build();
    }

    public UserProfileDto toUserProfileDto(UserProfile profile) {
        if (profile == null) {
            return null;
        }
        return UserProfileDto.builder()
                .user(toUserDto(profile.getUser()))
                .phone(profile.getPhone())
                .address(profile.getAddress())
                .city(profile.getCity())
                .state(profile.getState())
                .zipcode(profile.getZipcode())
                .country(profile.getCountry())
                .preferences(profile.getPreferences())
                .createdAt(profile.getCreatedAt())
                .build();
    }
}
