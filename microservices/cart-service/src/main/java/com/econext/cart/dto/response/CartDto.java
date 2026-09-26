package com.econext.cart.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CartDto {

    private Long id;

    @JsonProperty("user_id")
    private Long userId;

    private BigDecimal total;

    @JsonProperty("total_items")
    private Integer totalItems;

    @Builder.Default
    private List<CartItemDto> items = new ArrayList<>();

    @JsonProperty("created_at")
    private LocalDateTime createdAt;

    @JsonProperty("updated_at")
    private LocalDateTime updatedAt;
}
