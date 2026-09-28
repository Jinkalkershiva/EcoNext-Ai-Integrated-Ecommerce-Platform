package com.econext.order.entity;

public enum ShipmentStatus {
    CREATED,
    PACKED,
    DISPATCHED,
    IN_TRANSIT,
    ARRIVED_AT_HUB,
    OUT_FOR_DELIVERY,
    DELIVERED,
    FAILED_DELIVERY,
    CANCELLED,
    RETURNED
}
