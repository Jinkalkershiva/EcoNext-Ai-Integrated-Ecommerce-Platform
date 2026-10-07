package com.econext.order.entity;

public enum OrderStatus {
    ORDER_PLACED,
    ORDER_CONFIRMED,
    PROCESSING,
    PACKED,
    READY_FOR_SHIPMENT,
    ASSIGNED_TO_SHIPMENT,
    SHIPPED,
    IN_TRANSIT,
    OUT_FOR_DELIVERY,
    DELIVERY_VERIFICATION_STARTED,
    DELIVERY_VERIFIED,
    DELIVERED,
    CANCEL_REQUESTED,
    CANCELLED,
    RETURN_REQUESTED,
    INSPECTION_REQUIRED,
    RETURN_APPROVED,
    RETURN_REJECTED,
    RETURN_IN_TRANSIT,
    RETURN_RECEIVED,
    INSPECTION_PASSED,
    REFUND_PENDING,
    REFUND_PROCESSING,
    REFUNDED,
    RETURNED;

    /**
     * Maps the fine-grained operational status to the corresponding Django/User Panel status
     */
    public String toDjangoStatus() {
        return this.name();
    }
}
