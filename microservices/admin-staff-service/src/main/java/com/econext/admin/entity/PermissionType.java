package com.econext.admin.entity;

public enum PermissionType {
    // Catalog permissions
    CATALOG_CREATE,
    CATALOG_READ,
    CATALOG_UPDATE,
    CATALOG_DELETE,

    // Inventory permissions
    INVENTORY_CREATE,
    INVENTORY_READ,
    INVENTORY_UPDATE,
    INVENTORY_ADJUST,

    // Order permissions
    ORDER_READ,
    ORDER_UPDATE,
    ORDER_PROCESS,
    ORDER_STATUS_UPDATE,

    // Data operations
    DATA_IMPORT,
    DATA_EXPORT,
    DATA_ANALYSIS,

    // Staff management
    STAFF_CREATE,
    STAFF_READ,
    STAFF_UPDATE,
    STAFF_DISABLE,

    // Audit
    AUDIT_READ
}
