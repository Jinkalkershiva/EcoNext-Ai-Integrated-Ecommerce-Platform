package com.econext.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * EcoNext Central API Gateway Application.
 * <p>
 * Acts as the single entry point for the React frontend, routing requests to
 * downstream microservices and legacy endpoints based on URI predicates.
 */
@SpringBootApplication
public class ApiGatewayApplication {

    public static void main(String[] args) {
        SpringApplication.run(ApiGatewayApplication.class, args);
    }
}
