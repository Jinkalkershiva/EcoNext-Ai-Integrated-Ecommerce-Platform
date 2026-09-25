package com.econext.cart.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CartResponse {

    @Builder.Default
    private String status = "success";

    private String message;

    private CartDto cart;
}
