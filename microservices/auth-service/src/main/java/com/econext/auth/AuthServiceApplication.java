package com.econext.auth;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * EcoNext Auth & User Profile Microservice.
 * <p>
 * Manages user registration, authentication, JWT tokens, and user profiles.
 * Owns the dedicated 'econext_auth_db' MySQL database.
 */
@SpringBootApplication
public class AuthServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(AuthServiceApplication.class, args);
    }
}
