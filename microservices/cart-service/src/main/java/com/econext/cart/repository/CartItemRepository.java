package com.econext.cart.repository;

import com.econext.cart.entity.Cart;
import com.econext.cart.entity.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CartItemRepository extends JpaRepository<CartItem, Long> {

    Optional<CartItem> findByCartAndProductId(Cart cart, Long productId);

    Optional<CartItem> findByIdAndCart(Long id, Cart cart);
}
