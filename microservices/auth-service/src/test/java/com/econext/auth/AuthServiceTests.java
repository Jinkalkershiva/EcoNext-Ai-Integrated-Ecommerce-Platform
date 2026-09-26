package com.econext.auth;

import com.econext.auth.dto.request.LoginRequest;
import com.econext.auth.dto.request.LogoutRequest;
import com.econext.auth.dto.request.RefreshTokenRequest;
import com.econext.auth.dto.request.SignUpRequest;
import com.econext.auth.dto.request.UpdateProfileRequest;
import com.econext.auth.entity.User;
import com.econext.auth.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthServiceTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
    }

    @Test
    void testContextLoads() {
        assertNotNull(mockMvc);
        assertNotNull(userRepository);
    }

    @Test
    void testUserRegistrationSuccess() throws Exception {
        SignUpRequest request = SignUpRequest.builder()
                .username("ecouser")
                .email("ecouser@econext.com")
                .password("SecurePass123")
                .firstName("Eco")
                .lastName("Tester")
                .build();

        mockMvc.perform(post("/api/auth/signup/")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("success"))
                .andExpect(jsonPath("$.message").value("User registered successfully"))
                .andExpect(jsonPath("$.user.username").value("ecouser"))
                .andExpect(jsonPath("$.user.email").value("ecouser@econext.com"))
                .andExpect(jsonPath("$.tokens.access").isNotEmpty())
                .andExpect(jsonPath("$.tokens.refresh").isNotEmpty());

        // Verify password was hashed in database
        User savedUser = userRepository.findByUsernameIgnoreCase("ecouser").orElseThrow();
        assertNotEquals("SecurePass123", savedUser.getPasswordHash());
        assertTrue(passwordEncoder.matches("SecurePass123", savedUser.getPasswordHash()));
    }

    @Test
    void testDuplicateUsernameRegistrationFails() throws Exception {
        SignUpRequest request1 = SignUpRequest.builder()
                .username("duplicateuser")
                .email("user1@econext.com")
                .password("SecurePass123")
                .build();

        mockMvc.perform(post("/api/auth/signup/")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request1)))
                .andExpect(status().isCreated());

        SignUpRequest request2 = SignUpRequest.builder()
                .username("DuplicateUser") // Case-insensitive test
                .email("user2@econext.com")
                .password("SecurePass123")
                .build();

        mockMvc.perform(post("/api/auth/signup/")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request2)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("BAD_REQUEST"))
                .andExpect(jsonPath("$.message").value(containsString("Username already exists")));
    }

    @Test
    void testDuplicateEmailRegistrationFails() throws Exception {
        SignUpRequest request1 = SignUpRequest.builder()
                .username("userA")
                .email("sameemail@econext.com")
                .password("SecurePass123")
                .build();

        mockMvc.perform(post("/api/auth/signup/")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request1)))
                .andExpect(status().isCreated());

        SignUpRequest request2 = SignUpRequest.builder()
                .username("userB")
                .email("SAMEEMAIL@econext.com") // Case-insensitive test
                .password("SecurePass123")
                .build();

        mockMvc.perform(post("/api/auth/signup/")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request2)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("BAD_REQUEST"))
                .andExpect(jsonPath("$.message").value(containsString("Email already exists")));
    }

    @Test
    void testInvalidRegistrationValidationFails() throws Exception {
        SignUpRequest invalidRequest = SignUpRequest.builder()
                .username("")
                .email("invalid-email-format")
                .password("123") // Too short
                .build();

        mockMvc.perform(post("/api/auth/signup/")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.errors.username").exists())
                .andExpect(jsonPath("$.errors.email").exists())
                .andExpect(jsonPath("$.errors.password").exists());
    }

    @Test
    void testLoginSuccessAndProfilePayload() throws Exception {
        // First register
        SignUpRequest reg = SignUpRequest.builder()
                .username("loginuser")
                .email("loginuser@econext.com")
                .password("Password123!")
                .firstName("John")
                .lastName("Doe")
                .build();

        mockMvc.perform(post("/api/auth/signup/")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reg)))
                .andExpect(status().isCreated());

        // Login
        LoginRequest login = LoginRequest.builder()
                .username("loginuser")
                .password("Password123!")
                .build();

        mockMvc.perform(post("/api/auth/login/")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"))
                .andExpect(jsonPath("$.message").value("Login successful"))
                .andExpect(jsonPath("$.user.username").value("loginuser"))
                .andExpect(jsonPath("$.user.email").value("loginuser@econext.com"))
                .andExpect(jsonPath("$.profile").exists())
                .andExpect(jsonPath("$.tokens.access").isNotEmpty())
                .andExpect(jsonPath("$.tokens.refresh").isNotEmpty());
    }

    @Test
    void testLoginInvalidCredentialsFails() throws Exception {
        LoginRequest login = LoginRequest.builder()
                .username("nonexistent")
                .password("WrongPassword")
                .build();

        mockMvc.perform(post("/api/auth/login/")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("UNAUTHORIZED"));
    }

    @Test
    void testProtectedEndpointWithoutTokenFails() throws Exception {
        mockMvc.perform(get("/api/auth/current-user/"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("UNAUTHORIZED"));
    }

    @Test
    void testProtectedEndpointWithValidTokenSuccess() throws Exception {
        SignUpRequest reg = SignUpRequest.builder()
                .username("authcheck")
                .email("authcheck@econext.com")
                .password("SecretPass1")
                .build();

        MvcResult signupResult = mockMvc.perform(post("/api/auth/signup/")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reg)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode json = objectMapper.readTree(signupResult.getResponse().getContentAsString());
        String accessToken = json.get("tokens").get("access").asText();

        // Access current-user endpoint
        mockMvc.perform(get("/api/auth/current-user/")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"))
                .andExpect(jsonPath("$.user.username").value("authcheck"))
                .andExpect(jsonPath("$.user.email").value("authcheck@econext.com"))
                .andExpect(jsonPath("$.profile").exists());
    }

    @Test
    void testProfileUpdateEndpoint() throws Exception {
        SignUpRequest reg = SignUpRequest.builder()
                .username("updateuser")
                .email("updateuser@econext.com")
                .password("SecretPass1")
                .build();

        MvcResult signupResult = mockMvc.perform(post("/api/auth/signup/")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reg)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode json = objectMapper.readTree(signupResult.getResponse().getContentAsString());
        String accessToken = json.get("tokens").get("access").asText();

        // Update profile
        UpdateProfileRequest updateReq = UpdateProfileRequest.builder()
                .firstName("UpdatedFirst")
                .lastName("UpdatedLast")
                .phone("+91-9876543210")
                .city("Hyderabad")
                .state("Telangana")
                .country("India")
                .build();

        mockMvc.perform(put("/api/auth/profile/update/")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"))
                .andExpect(jsonPath("$.message").value("Profile updated successfully"))
                .andExpect(jsonPath("$.user.first_name").value("UpdatedFirst"))
                .andExpect(jsonPath("$.user.last_name").value("UpdatedLast"))
                .andExpect(jsonPath("$.profile.phone").value("+91-9876543210"))
                .andExpect(jsonPath("$.profile.city").value("Hyderabad"));
    }

    @Test
    void testRefreshTokenExchange() throws Exception {
        SignUpRequest reg = SignUpRequest.builder()
                .username("tokenuser")
                .email("tokenuser@econext.com")
                .password("SecretPass1")
                .build();

        MvcResult signupResult = mockMvc.perform(post("/api/auth/signup/")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reg)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode json = objectMapper.readTree(signupResult.getResponse().getContentAsString());
        String refreshToken = json.get("tokens").get("refresh").asText();

        RefreshTokenRequest refreshReq = RefreshTokenRequest.builder()
                .refresh(refreshToken)
                .build();

        mockMvc.perform(post("/api/auth/refresh/")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(refreshReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.access").isNotEmpty())
                .andExpect(jsonPath("$.refresh").isNotEmpty());
    }

    @Test
    void testLogoutEndpoint() throws Exception {
        SignUpRequest reg = SignUpRequest.builder()
                .username("logoutuser")
                .email("logoutuser@econext.com")
                .password("SecretPass1")
                .build();

        MvcResult signupResult = mockMvc.perform(post("/api/auth/signup/")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reg)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode json = objectMapper.readTree(signupResult.getResponse().getContentAsString());
        String accessToken = json.get("tokens").get("access").asText();

        LogoutRequest logoutReq = LogoutRequest.builder()
                .refresh(json.get("tokens").get("refresh").asText())
                .build();

        mockMvc.perform(post("/api/auth/logout/")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(logoutReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"))
                .andExpect(jsonPath("$.message").value("Logout successful"));
    }
}
