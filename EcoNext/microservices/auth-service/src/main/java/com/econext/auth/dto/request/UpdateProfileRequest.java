package com.econext.auth.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.Email;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateProfileRequest {

    @Email(message = "Email must be a valid email address")
    private String email;

    @JsonAlias({"first_name", "firstName"})
    private String firstName;

    @JsonAlias({"last_name", "lastName"})
    private String lastName;

    private String phone;
    private String address;
    private String city;
    private String state;
    private String zipcode;
    private String country;
}
