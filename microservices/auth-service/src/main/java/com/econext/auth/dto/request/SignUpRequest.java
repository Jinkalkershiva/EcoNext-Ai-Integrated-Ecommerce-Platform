package com.econext.auth.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SignUpRequest {

    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 150, message = "Username must be between 3 and 150 characters")
    private String username;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be a valid email address")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters long")
    private String password;

    @JsonAlias({"password_confirm", "passwordConfirm"})
    private String passwordConfirm;

    @JsonAlias({"first_name", "firstName", "fullName"})
    private String firstName;

    @JsonAlias({"last_name", "lastName"})
    private String lastName;
}
