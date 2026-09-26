package com.econext.auth.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserProfileDto {

    private UserDto user;
    private String phone;
    private String address;
    private String city;
    private String state;
    private String zipcode;
    private String country;
    private String preferences;

    @JsonProperty("created_at")
    private LocalDateTime createdAt;
}
