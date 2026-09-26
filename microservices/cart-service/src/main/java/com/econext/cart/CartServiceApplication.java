package com.econext.cart;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * EcoNext Shopping Cart Microservice.
 * <p>
 * Manages user cart lifecycle, item quantities, subtotal calculations,
 * and cart persistence. Owns the dedicated 'econext_cart_db' MySQL database.
 */
@SpringBootApplication
public class CartServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(CartServiceApplication.class, args);
    }
}
