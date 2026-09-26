package com.econext.cart.service;

import com.econext.cart.dto.request.AddToCartRequest;
import com.econext.cart.dto.request.UpdateCartItemRequest;
import com.econext.cart.dto.response.CartDto;
import com.econext.cart.dto.response.CartItemDto;
import com.econext.cart.dto.response.CartResponse;
import com.econext.cart.entity.Cart;
import com.econext.cart.entity.CartItem;
import com.econext.cart.exception.BadRequestException;
import com.econext.cart.exception.ResourceNotFoundException;
import com.econext.cart.repository.CartItemRepository;
import com.econext.cart.repository.CartRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CartService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;

    private static final int MAX_QUANTITY_PER_ITEM = 99;

    @Transactional
    public Cart getOrCreateCartEntity(Long userId) {
        return cartRepository.findByUserId(userId)
                .orElseGet(() -> cartRepository.save(
                        Cart.builder()
                                .userId(userId)
                                .items(new ArrayList<>())
                                .build()
                ));
    }

    @Transactional(readOnly = true)
    public CartResponse getCart(Long userId) {
        log.info("Fetching shopping cart for user id: {}", userId);
        Cart cart = cartRepository.findByUserId(userId)
                .orElseGet(() -> Cart.builder()
                        .userId(userId)
                        .items(new ArrayList<>())
                        .build());
        return CartResponse.builder()
                .status("success")
                .cart(toCartDto(cart))
                .build();
    }

    @Transactional
    public CartResponse addToCart(Long userId, AddToCartRequest request) {
        log.info("Adding product id {} (qty: {}) to cart for user id: {}", request.getProductId(), request.getQuantity(), userId);

        if (request.getProductId() == null) {
            throw new BadRequestException("product_id is required.");
        }

        int addQty = request.getQuantity() != null ? request.getQuantity() : 1;
        if (addQty < 1) {
            throw new BadRequestException("Quantity must be at least 1.");
        }
        if (addQty > MAX_QUANTITY_PER_ITEM) {
            throw new BadRequestException("Quantity cannot exceed " + MAX_QUANTITY_PER_ITEM + " per item.");
        }

        Cart cart = getOrCreateCartEntity(userId);
        Optional<CartItem> existingItemOpt = cartItemRepository.findByCartAndProductId(cart, request.getProductId());

        String productName = request.getProductName() != null ? request.getProductName() : "Product #" + request.getProductId();
        BigDecimal unitPrice = request.getUnitPrice() != null ? request.getUnitPrice() : BigDecimal.ZERO;
        String productImage = request.getProductImage() != null ? request.getProductImage() : "";

        if (existingItemOpt.isPresent()) {
            CartItem existingItem = existingItemOpt.get();
            int newQuantity = Math.min(existingItem.getQuantity() + addQty, MAX_QUANTITY_PER_ITEM);
            existingItem.setQuantity(newQuantity);
            if (request.getUnitPrice() != null) {
                existingItem.setUnitPrice(request.getUnitPrice());
            }
            if (request.getProductName() != null) {
                existingItem.setProductName(request.getProductName());
            }
            if (request.getProductImage() != null) {
                existingItem.setProductImage(request.getProductImage());
            }
            cartItemRepository.save(existingItem);
        } else {
            CartItem newItem = CartItem.builder()
                    .cart(cart)
                    .productId(request.getProductId())
                    .productName(productName)
                    .productImage(productImage)
                    .unitPrice(unitPrice)
                    .quantity(addQty)
                    .build();
            cart.getItems().add(newItem);
            cartItemRepository.save(newItem);
        }

        Cart savedCart = cartRepository.save(cart);
        return CartResponse.builder()
                .status("success")
                .message(productName + " added to cart.")
                .cart(toCartDto(savedCart))
                .build();
    }

    @Transactional
    public CartResponse updateCartItem(Long userId, Long itemId, UpdateCartItemRequest request) {
        log.info("Updating cart item id {} for user id: {}", itemId, userId);

        if (request.getQuantity() == null) {
            throw new BadRequestException("quantity is required.");
        }

        int quantity = request.getQuantity();
        if (quantity < 0) {
            throw new BadRequestException("Quantity cannot be negative.");
        }
        if (quantity > MAX_QUANTITY_PER_ITEM) {
            throw new BadRequestException("Quantity cannot exceed " + MAX_QUANTITY_PER_ITEM + " per item.");
        }

        Cart cart = cartRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart not found for user."));

        CartItem item = cartItemRepository.findByIdAndCart(itemId, cart)
                .orElseThrow(() -> new ResourceNotFoundException("Cart item not found."));

        if (quantity == 0) {
            cart.getItems().remove(item);
            cartItemRepository.delete(item);
            Cart savedCart = cartRepository.save(cart);
            return CartResponse.builder()
                    .status("success")
                    .message("Item removed from cart.")
                    .cart(toCartDto(savedCart))
                    .build();
        }

        item.setQuantity(quantity);
        cartItemRepository.save(item);
        Cart savedCart = cartRepository.save(cart);

        return CartResponse.builder()
                .status("success")
                .cart(toCartDto(savedCart))
                .build();
    }

    @Transactional
    public CartResponse removeCartItem(Long userId, Long itemId) {
        log.info("Removing cart item id {} for user id: {}", itemId, userId);

        Cart cart = cartRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart not found for user."));

        CartItem item = cartItemRepository.findByIdAndCart(itemId, cart)
                .orElseThrow(() -> new ResourceNotFoundException("Cart item not found."));

        cart.getItems().remove(item);
        cartItemRepository.delete(item);
        Cart savedCart = cartRepository.save(cart);

        return CartResponse.builder()
                .status("success")
                .message("Item removed from cart.")
                .cart(toCartDto(savedCart))
                .build();
    }

    @Transactional
    public CartResponse clearCart(Long userId) {
        log.info("Clearing entire cart for user id: {}", userId);

        Cart cart = getOrCreateCartEntity(userId);
        cart.getItems().clear();
        Cart savedCart = cartRepository.save(cart);

        return CartResponse.builder()
                .status("success")
                .message("Cart cleared.")
                .cart(toCartDto(savedCart))
                .build();
    }

    private CartDto toCartDto(Cart cart) {
        List<CartItemDto> itemDtos = cart.getItems() != null
                ? cart.getItems().stream().map(this::toCartItemDto).collect(Collectors.toList())
                : new ArrayList<>();

        BigDecimal total = itemDtos.stream()
                .map(CartItemDto::getSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        int totalItems = itemDtos.stream()
                .mapToInt(CartItemDto::getQuantity)
                .sum();

        return CartDto.builder()
                .id(cart.getId())
                .userId(cart.getUserId())
                .total(total)
                .totalItems(totalItems)
                .items(itemDtos)
                .createdAt(cart.getCreatedAt())
                .updatedAt(cart.getUpdatedAt())
                .build();
    }

    private CartItemDto toCartItemDto(CartItem item) {
        return CartItemDto.builder()
                .id(item.getId())
                .productId(item.getProductId())
                .productName(item.getProductName())
                .productImage(item.getProductImage())
                .unitPrice(item.getUnitPrice())
                .quantity(item.getQuantity())
                .subtotal(item.getSubtotal())
                .addedAt(item.getAddedAt())
                .build();
    }
}
