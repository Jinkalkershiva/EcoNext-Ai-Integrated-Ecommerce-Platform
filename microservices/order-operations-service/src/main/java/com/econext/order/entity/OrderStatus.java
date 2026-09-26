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
        switch (this) {
            case ORDER_PLACED:
                return "pending";
            case ORDER_CONFIRMED:
                return "confirmed";
            case PROCESSING:
            case PACKED:
                return "confirmed";
            case SHIPPED:
            case IN_TRANSIT:
            case OUT_FOR_DELIVERY:
                return "shipped";
            case DELIVERED:
                return "delivered";
            case CANCELLED:
                return "cancelled";
            case RETURN_REQUESTED:
            case RETURNED:
                return "cancelled";
            default:
                return "pending";
        }
    }
}
