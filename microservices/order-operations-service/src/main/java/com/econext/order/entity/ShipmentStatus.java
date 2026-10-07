package com.econext.order.entity;

public enum ShipmentStatus {
    OPEN,
    CREATED,
    ASSIGNED,
    FULL,
    READY_FOR_DISPATCH,
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
