package com.econext.order.entity;

public enum OrderStatus {
    ORDER_PLACED,
    ORDER_CONFIRMED,
    PROCESSING,
    PACKED,
    SHIPPED,
    IN_TRANSIT,
    OUT_FOR_DELIVERY,
    DELIVERED,
    CANCELLED,
    RETURN_REQUESTED,
    RETURNED;

    /**
     * Maps the fine-grained operational status to the corresponding Django/User Panel status
     */
    public String toDjangoStatus() {
        return this.name();
    }
}
