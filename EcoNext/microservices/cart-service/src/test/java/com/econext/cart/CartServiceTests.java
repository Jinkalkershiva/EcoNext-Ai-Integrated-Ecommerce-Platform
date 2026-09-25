package com.econext.cart;

import com.econext.cart.dto.request.AddToCartRequest;
import com.econext.cart.dto.request.UpdateCartItemRequest;
import com.econext.cart.entity.Cart;
import com.econext.cart.entity.CartItem;
import com.econext.cart.repository.CartItemRepository;
import com.econext.cart.repository.CartRepository;
import com.econext.cart.security.JwtTokenProvider;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CartServiceTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CartRepository cartRepository;

    @Autowired
    private CartItemRepository cartItemRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private ObjectMapper objectMapper;

    private String userToken;
    private String otherUserToken;
    private Long userId = 101L;
    private Long otherUserId = 202L;

    @BeforeEach
    void setUp() {
        cartItemRepository.deleteAll();
        cartRepository.deleteAll();

        userToken = jwtTokenProvider.generateToken(userId, "testuser", "testuser@econext.com", "ROLE_USER");
        otherUserToken = jwtTokenProvider.generateToken(otherUserId, "otheruser", "otheruser@econext.com", "ROLE_USER");
    }

    @Test
    void testContextLoads() {
        assertNotNull(mockMvc);
        assertNotNull(cartRepository);
        assertNotNull(cartItemRepository);
    }

    @Test
    void testProtectedEndpointWithoutTokenFails() throws Exception {
        mockMvc.perform(get("/api/cart/"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("UNAUTHORIZED"));
    }

    @Test
    void testGetEmptyCart() throws Exception {
        mockMvc.perform(get("/api/cart/")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"))
                .andExpect(jsonPath("$.cart.user_id").value(userId))
                .andExpect(jsonPath("$.cart.total_items").value(0))
                .andExpect(jsonPath("$.cart.total").value(0))
                .andExpect(jsonPath("$.cart.items").isArray())
                .andExpect(jsonPath("$.cart.items").isEmpty());
    }

    @Test
    void testAddToCartSuccess() throws Exception {
        AddToCartRequest request = AddToCartRequest.builder()
                .productId(42L)
                .productName("Bamboo Eco Toothbrush")
                .productImage("https://example.com/bamboo-brush.jpg")
                .unitPrice(new BigDecimal("12.99"))
                .quantity(2)
                .build();

        mockMvc.perform(post("/api/cart/add/")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("success"))
                .andExpect(jsonPath("$.message").value("Bamboo Eco Toothbrush added to cart."))
                .andExpect(jsonPath("$.cart.user_id").value(userId))
                .andExpect(jsonPath("$.cart.total_items").value(2))
                .andExpect(jsonPath("$.cart.total").value(25.98))
                .andExpect(jsonPath("$.cart.items[0].product_id").value(42))
                .andExpect(jsonPath("$.cart.items[0].product_name").value("Bamboo Eco Toothbrush"))
                .andExpect(jsonPath("$.cart.items[0].quantity").value(2))
                .andExpect(jsonPath("$.cart.items[0].unit_price").value(12.99))
                .andExpect(jsonPath("$.cart.items[0].subtotal").value(25.98));
    }

    @Test
    void testAddSameProductMultipleTimesAccumulatesQuantity() throws Exception {
        AddToCartRequest request1 = AddToCartRequest.builder()
                .productId(10L)
                .productName("Reusable Water Bottle")
                .unitPrice(new BigDecimal("20.00"))
                .quantity(2)
                .build();

        mockMvc.perform(post("/api/cart/add/")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request1)))
                .andExpect(status().isCreated());

        AddToCartRequest request2 = AddToCartRequest.builder()
                .productId(10L)
                .productName("Reusable Water Bottle")
                .unitPrice(new BigDecimal("20.00"))
                .quantity(3)
                .build();

        mockMvc.perform(post("/api/cart/add/")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request2)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.cart.total_items").value(5))
                .andExpect(jsonPath("$.cart.total").value(100.00))
                .andExpect(jsonPath("$.cart.items[0].quantity").value(5));
    }

    @Test
    void testAddToCartValidationFailsWhenProductIdMissing() throws Exception {
        AddToCartRequest request = AddToCartRequest.builder()
                .productName("No ID Product")
                .unitPrice(new BigDecimal("10.00"))
                .quantity(1)
                .build();

        mockMvc.perform(post("/api/cart/add/")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("VALIDATION_ERROR"));
    }

    @Test
    void testAddToCartValidationFailsWhenQuantityNegativeOrTooLarge() throws Exception {
        AddToCartRequest invalidQtyRequest = AddToCartRequest.builder()
                .productId(5L)
                .productName("Invalid Qty Product")
                .quantity(-1)
                .build();

        mockMvc.perform(post("/api/cart/add/")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidQtyRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("VALIDATION_ERROR"));

        AddToCartRequest excessiveQtyRequest = AddToCartRequest.builder()
                .productId(5L)
                .productName("Excessive Qty Product")
                .quantity(150)
                .build();

        mockMvc.perform(post("/api/cart/add/")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(excessiveQtyRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("VALIDATION_ERROR"));
    }

    @Test
    void testUpdateCartItemQuantity() throws Exception {
        // Add item first
        AddToCartRequest addReq = AddToCartRequest.builder()
                .productId(88L)
                .productName("Solar Charger")
                .unitPrice(new BigDecimal("50.00"))
                .quantity(1)
                .build();

        MvcResult addResult = mockMvc.perform(post("/api/cart/add/")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(addReq)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode json = objectMapper.readTree(addResult.getResponse().getContentAsString());
        long itemId = json.get("cart").get("items").get(0).get("id").asLong();

        // Update quantity to 4
        UpdateCartItemRequest updateReq = UpdateCartItemRequest.builder()
                .quantity(4)
                .build();

        mockMvc.perform(put("/api/cart/item/" + itemId + "/")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"))
                .andExpect(jsonPath("$.cart.total_items").value(4))
                .andExpect(jsonPath("$.cart.total").value(200.00))
                .andExpect(jsonPath("$.cart.items[0].quantity").value(4));
    }

    @Test
    void testUpdateCartItemQuantityZeroRemovesItem() throws Exception {
        AddToCartRequest addReq = AddToCartRequest.builder()
                .productId(99L)
                .productName("Organic Cotton Shirt")
                .unitPrice(new BigDecimal("35.00"))
                .quantity(2)
                .build();

        MvcResult addResult = mockMvc.perform(post("/api/cart/add/")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(addReq)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode json = objectMapper.readTree(addResult.getResponse().getContentAsString());
        long itemId = json.get("cart").get("items").get(0).get("id").asLong();

        // Update with quantity 0
        UpdateCartItemRequest updateReq = UpdateCartItemRequest.builder()
                .quantity(0)
                .build();

        mockMvc.perform(patch("/api/cart/item/" + itemId + "/")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"))
                .andExpect(jsonPath("$.message").value("Item removed from cart."))
                .andExpect(jsonPath("$.cart.total_items").value(0))
                .andExpect(jsonPath("$.cart.items").isEmpty());
    }

    @Test
    void testRemoveCartItemEndpoint() throws Exception {
        AddToCartRequest addReq = AddToCartRequest.builder()
                .productId(7L)
                .productName("Compost Bin")
                .unitPrice(new BigDecimal("45.00"))
                .quantity(1)
                .build();

        MvcResult addResult = mockMvc.perform(post("/api/cart/add/")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(addReq)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode json = objectMapper.readTree(addResult.getResponse().getContentAsString());
        long itemId = json.get("cart").get("items").get(0).get("id").asLong();

        // Remove via /api/cart/item/{id}/delete/
        mockMvc.perform(delete("/api/cart/item/" + itemId + "/delete/")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"))
                .andExpect(jsonPath("$.message").value("Item removed from cart."))
                .andExpect(jsonPath("$.cart.total_items").value(0));
    }

    @Test
    void testClearCartEndpoint() throws Exception {
        AddToCartRequest item1 = AddToCartRequest.builder()
                .productId(1L)
                .productName("Item 1")
                .unitPrice(new BigDecimal("10.00"))
                .quantity(1)
                .build();

        AddToCartRequest item2 = AddToCartRequest.builder()
                .productId(2L)
                .productName("Item 2")
                .unitPrice(new BigDecimal("20.00"))
                .quantity(2)
                .build();

        mockMvc.perform(post("/api/cart/add/")
                .header("Authorization", "Bearer " + userToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(item1)));

        mockMvc.perform(post("/api/cart/add/")
                .header("Authorization", "Bearer " + userToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(item2)));

        mockMvc.perform(post("/api/cart/clear/")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"))
                .andExpect(jsonPath("$.message").value("Cart cleared."))
                .andExpect(jsonPath("$.cart.total_items").value(0))
                .andExpect(jsonPath("$.cart.items").isEmpty());
    }

    @Test
    void testCartIsolationBetweenDifferentUsers() throws Exception {
        // User 1 adds item
        AddToCartRequest user1Item = AddToCartRequest.builder()
                .productId(100L)
                .productName("User1 Product")
                .unitPrice(new BigDecimal("15.00"))
                .quantity(3)
                .build();

        mockMvc.perform(post("/api/cart/add/")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(user1Item)))
                .andExpect(status().isCreated());

        // User 2 gets cart -> should be empty
        mockMvc.perform(get("/api/cart/")
                        .header("Authorization", "Bearer " + otherUserToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cart.user_id").value(otherUserId))
                .andExpect(jsonPath("$.cart.total_items").value(0))
                .andExpect(jsonPath("$.cart.items").isEmpty());
    }
}
