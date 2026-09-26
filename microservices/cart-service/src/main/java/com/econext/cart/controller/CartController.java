package com.econext.cart.controller;

import com.econext.cart.dto.request.AddToCartRequest;
import com.econext.cart.dto.request.UpdateCartItemRequest;
import com.econext.cart.dto.response.CartResponse;
import com.econext.cart.security.UserPrincipal;
import com.econext.cart.service.CartService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
@Slf4j
public class CartController {

    private final CartService cartService;

    @GetMapping({"", "/"})
    public ResponseEntity<CartResponse> getCart(
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        log.info("API Request: GET /api/cart/ by user id: {}", currentUser.getId());
        CartResponse response = cartService.getCart(currentUser.getId());
        return ResponseEntity.ok(response);
    }

    @PostMapping({"/add", "/add/"})
    public ResponseEntity<CartResponse> addToCart(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @Valid @RequestBody AddToCartRequest request
    ) {
        log.info("API Request: POST /api/cart/add/ by user id: {}", currentUser.getId());
        CartResponse response = cartService.addToCart(currentUser.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @RequestMapping(
            value = {"/item/{itemId}", "/item/{itemId}/"},
            method = {RequestMethod.PUT, RequestMethod.PATCH}
    )
    public ResponseEntity<CartResponse> updateCartItem(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable("itemId") Long itemId,
            @Valid @RequestBody UpdateCartItemRequest request
    ) {
        log.info("API Request: PUT/PATCH /api/cart/item/{}/ by user id: {}", itemId, currentUser.getId());
        CartResponse response = cartService.updateCartItem(currentUser.getId(), itemId, request);
        return ResponseEntity.ok(response);
    }

    @RequestMapping(
            value = {
                    "/item/{itemId}", "/item/{itemId}/",
                    "/item/{itemId}/delete", "/item/{itemId}/delete/"
            },
            method = {RequestMethod.DELETE, RequestMethod.POST}
    )
    public ResponseEntity<CartResponse> removeCartItem(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable("itemId") Long itemId
    ) {
        log.info("API Request: DELETE /api/cart/item/{}/delete/ by user id: {}", itemId, currentUser.getId());
        CartResponse response = cartService.removeCartItem(currentUser.getId(), itemId);
        return ResponseEntity.ok(response);
    }

    @RequestMapping(
            value = {"/clear", "/clear/"},
            method = {RequestMethod.DELETE, RequestMethod.POST}
    )
    public ResponseEntity<CartResponse> clearCart(
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        log.info("API Request: POST/DELETE /api/cart/clear/ by user id: {}", currentUser.getId());
        CartResponse response = cartService.clearCart(currentUser.getId());
        return ResponseEntity.ok(response);
    }
}
