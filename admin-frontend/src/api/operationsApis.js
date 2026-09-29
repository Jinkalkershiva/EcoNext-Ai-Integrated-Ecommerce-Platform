import { apiRequest, authStore } from './client';
import { 
  staffApi as baseStaffApi, 
  rolesApi as baseRolesApi, 
  authApi as baseAuthApi,
  databaseQueryApi as baseDatabaseQueryApi,
  bulkImportApi as baseBulkImportApi
} from './adminApis';

// Re-export staff & role APIs
export const staffApi = {
  ...baseStaffApi,
  updateStaffRoles: async (id, roles) => {
    const res = await apiRequest(`/admin/staff/${id}`, {
      method: 'PUT',
      body: { roles }
    });
    return res.data || res;
  },
  updateStaffStatus: async (id, status) => {
    return baseStaffApi.updateStatus(id, status);
  }
};

export const roleApi = {
  ...baseRolesApi,
  getAllRoles: baseRolesApi.getAllRoles
};

export const authApi = baseAuthApi;
export const databaseQueryApi = baseDatabaseQueryApi;
export const bulkImportApi = baseBulkImportApi;

export const catalogOpsApi = {
  getProducts: async (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.append('search', params.search);
    if (params.categoryId) searchParams.append('category', params.categoryId);
    if (params.status) searchParams.append('status', params.status);
    if (params.stock_status) searchParams.append('stock_status', params.stock_status);
    if (params.page !== undefined) searchParams.append('page', params.page);
    if (params.size !== undefined) searchParams.append('size', params.size);

    const query = searchParams.toString();
    try {
      const res = await apiRequest(`/admin/products/${query ? '?' + query : ''}`);
      return res.products || res.data || res;
    } catch {
      const res = await apiRequest(`/catalog-ops/products${query ? '?' + query : ''}`);
      return res.data || res;
    }
  },

  getProductById: async (id) => {
    try {
      const res = await apiRequest(`/admin/products/${id}/`);
      return res.product || res.data || res;
    } catch {
      const res = await apiRequest(`/catalog-ops/products/${id}`);
      return res.data || res;
    }
  },

  createProduct: async (productData) => {
    try {
      const res = await apiRequest('/admin/products/', {
        method: 'POST',
        body: productData
      });
      return res.product || res.data || res;
    } catch {
      const res = await apiRequest('/catalog-ops/products', {
        method: 'POST',
        body: productData
      });
      return res.data || res;
    }
  },

  updateProduct: async (id, productData) => {
    try {
      const res = await apiRequest(`/admin/products/${id}/`, {
        method: 'PATCH',
        body: productData
      });
      return res.product || res.data || res;
    } catch {
      const res = await apiRequest(`/catalog-ops/products/${id}`, {
        method: 'PUT',
        body: productData
      });
      return res.data || res;
    }
  },

  deleteProduct: async (id) => {
    try {
      const res = await apiRequest(`/admin/products/${id}/`, {
        method: 'DELETE'
      });
      return res.data || res;
    } catch {
      const res = await apiRequest(`/catalog-ops/products/${id}`, {
        method: 'DELETE'
      });
      return res.data || res;
    }
  },

  getCategories: async () => {
    try {
      const res = await apiRequest('/admin/categories/');
      return res.categories || res.data || res || [];
    } catch {
      const res = await apiRequest('/catalog-ops/categories');
      return res.data || res || [];
    }
  },

  createCategory: async (categoryData) => {
    try {
      const res = await apiRequest('/admin/categories/', {
        method: 'POST',
        body: categoryData
      });
      return res.category || res.data || res;
    } catch {
      const res = await apiRequest('/catalog-ops/categories', {
        method: 'POST',
        body: categoryData
      });
      return res.data || res;
    }
  },

  updateCategory: async (id, categoryData) => {
    try {
      const res = await apiRequest(`/admin/categories/${id}/`, {
        method: 'PUT',
        body: categoryData
      });
      return res.category || res.data || res;
    } catch {
      const res = await apiRequest(`/catalog-ops/categories/${id}`, {
        method: 'PUT',
        body: categoryData
      });
      return res.data || res;
    }
  },

  deleteCategory: async (id) => {
    try {
      const res = await apiRequest(`/admin/categories/${id}/`, {
        method: 'DELETE'
      });
      return res.data || res;
    } catch {
      const res = await apiRequest(`/catalog-ops/categories/${id}`, {
        method: 'DELETE'
      });
      return res.data || res;
    }
  }
};

export const catalogApi = catalogOpsApi;

export const inventoryOpsApi = {
  getInventoryList: async () => {
    try {
      const res = await apiRequest('/admin/products/');
      return res.products || res.data || [];
    } catch {
      const res = await apiRequest('/catalog-ops/products?size=200');
      return res.data?.content || res.data || [];
    }
  },

  getLowStock: async () => {
    try {
      const res = await apiRequest('/admin/products/?stock_status=low');
      return res.products || res.data || [];
    } catch {
      const res = await apiRequest('/inventory-ops/low-stock');
      return res.data || [];
    }
  },

  adjustStock: async (adjustmentData) => {
    const id = adjustmentData.productId || adjustmentData.id;
    const stockQty = adjustmentData.newQuantity !== undefined ? adjustmentData.newQuantity : adjustmentData.stock;
    try {
      const res = await apiRequest(`/admin/products/${id}/`, {
        method: 'PATCH',
        body: { stock: stockQty }
      });
      return res.product || res.data || res;
    } catch {
      const res = await apiRequest('/inventory-ops/adjust', {
        method: 'POST',
        body: adjustmentData
      });
      return res.data || res;
    }
  },

  getSummary: async () => {
    try {
      const res = await apiRequest('/admin/dashboard/');
      const m = res.metrics || res.data || {};
      return {
        totalSkus: m.total_products || 0,
        lowStockCount: m.low_stock_count || m.low_stock_products || 0,
        outOfStockCount: m.out_of_stock_products || 0,
        totalValuation: m.total_revenue || 0
      };
    } catch {
      return { totalSkus: 0, lowStockCount: 0, outOfStockCount: 0, totalValuation: 0 };
    }
  },

  getProductAdjustments: async (productId, page = 0, size = 15) => {
    try {
      const res = await apiRequest(`/inventory-ops/adjustments/product/${productId}?page=${page}&size=${size}`);
      return res.data || res;
    } catch {
      return { content: [] };
    }
  }
};

export const inventoryApi = inventoryOpsApi;

export const orderOpsApi = {
  getOrders: async (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.status && params.status !== 'ALL') searchParams.append('status', params.status);
    if (params.search) searchParams.append('search', params.search);
    if (params.page !== undefined) searchParams.append('page', params.page);
    if (params.size !== undefined) searchParams.append('size', params.size);

    const query = searchParams.toString();
    try {
      const res = await apiRequest(`/admin/orders/${query ? '?' + query : ''}`);
      return res.orders || res.data || (Array.isArray(res) ? res : []);
    } catch {
      const res = await apiRequest(`/order-ops/orders${query ? '?' + query : ''}`);
      return res.content || res.data || (Array.isArray(res) ? res : []);
    }
  },

  getOrderById: async (id) => {
    try {
      const res = await apiRequest(`/admin/orders/${id}/`);
      return res.order || res.data || res;
    } catch {
      const res = await apiRequest(`/order-ops/orders/${id}`);
      return res.data || res;
    }
  },

  updateOrderStatus: async (id, updateData) => {
    try {
      const res = await apiRequest(`/admin/orders/${id}/status/`, {
        method: 'PATCH',
        body: updateData
      });
      return res.order || res.data || res;
    } catch {
      const res = await apiRequest(`/order-ops/orders/${id}/status`, {
        method: 'PATCH',
        body: updateData
      });
      return res.data || res;
    }
  },

  getOrderTimeline: async (id) => {
    try {
      const res = await apiRequest(`/admin/orders/${id}/`);
      const order = res.order || res.data || res;
      return order.tracking_timeline || order.timeline || order.status_history || [];
    } catch {
      const res = await apiRequest(`/order-ops/orders/${id}/timeline`);
      return res.data || res || [];
    }
  },

  getOrderSummary: async () => {
    try {
      const res = await apiRequest('/admin/dashboard/');
      return res.metrics || res.data || res;
    } catch {
      const res = await apiRequest('/order-ops/summary');
      return res.data || res;
    }
  }
};

export const orderApi = orderOpsApi;

export const customerOpsApi = {
  getCustomers: async (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.append('search', params.search);
    if (params.role) searchParams.append('role', params.role);
    if (params.page !== undefined) searchParams.append('page', params.page);
    if (params.size !== undefined) searchParams.append('size', params.size);

    const query = searchParams.toString();
    try {
      const res = await apiRequest(`/admin/customers/${query ? '?' + query : ''}`);
      return res.users || res.customers || res.data || res;
    } catch {
      const res = await apiRequest(`/admin/users/${query ? '?' + query : ''}`);
      return res.users || res.data || res;
    }
  },

  getCustomerById: async (id) => {
    const res = await apiRequest(`/admin/users/${id}/`);
    return res.data || res;
  }
};

export const paymentOpsApi = {
  getPayments: async (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.status && params.status !== 'ALL') searchParams.append('payment_status', params.status);
    if (params.search) searchParams.append('search', params.search);
    if (params.page !== undefined) searchParams.append('page', params.page);
    if (params.size !== undefined) searchParams.append('size', params.size);

    const query = searchParams.toString();
    const res = await apiRequest(`/admin/payments/${query ? '?' + query : ''}`);
    return res.payments || res.data || res;
  }
};

export const notificationOpsApi = {
  getNotifications: async (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.channel) searchParams.append('channel', params.channel);
    if (params.search) searchParams.append('search', params.search);
    if (params.page !== undefined) searchParams.append('page', params.page);
    if (params.size !== undefined) searchParams.append('size', params.size);

    const query = searchParams.toString();
    const res = await apiRequest(`/admin/notifications/${query ? '?' + query : ''}`);
    return res.notifications || res.data || res;
  }
};

export const dataImportApi = {
  uploadFile: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiRequest('/import/upload', {
      method: 'POST',
      body: formData,
      isFormData: true
    });
    return res.data || res;
  },

  previewData: async (fileId, columnMapping, checkDuplicates = true) => {
    const res = await apiRequest('/import/preview', {
      method: 'POST',
      body: { fileId, columnMapping, checkDuplicates }
    });
    return res.data || res;
  },

  executeImport: async (fileId, targetType, columnMapping, skipInvalidRows = true) => {
    const res = await apiRequest('/import/execute', {
      method: 'POST',
      body: { fileId, targetType, columnMapping, skipInvalidRows }
    });
    return res.data || res;
  },

  getJobStatus: async (id) => {
    const res = await apiRequest(`/import/jobs/${id}`);
    return res.data || res;
  }
};

export const importApi = dataImportApi;

export const analyticsApi = {
  getExecutiveDashboard: async () => {
    const res = await apiRequest('/admin/dashboard/');
    return res.metrics || res.data || res;
  },

  getDashboardKpis: async () => {
    const res = await apiRequest('/admin/dashboard/');
    return res.metrics || res.data || res;
  }
};

export const auditApi = {
  getAuditLogs: async (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.actor) searchParams.append('actor', params.actor);
    if (params.action) searchParams.append('action', params.action);
    if (params.resourceType) searchParams.append('resourceType', params.resourceType);
    if (params.page !== undefined) searchParams.append('page', params.page);
    if (params.size !== undefined) searchParams.append('size', params.size);

    const query = searchParams.toString();
    try {
      const res = await apiRequest(`/admin/audit${query ? '?' + query : ''}`);
      return res.data || res;
    } catch {
      return { content: [] };
    }
  },

  getRecentLogs: async () => {
    try {
      const res = await apiRequest('/admin/audit/recent');
      return res.data || res || [];
    } catch {
      return [];
    }
  },

  getStaffActivityMetrics: async () => {
    try {
      const res = await apiRequest('/admin/staff/activity-metrics');
      return res.data || res || [];
    } catch {
      return [];
    }
  }
};

export const liveSourcesApi = {
  getSources: async () => {
    const res = await apiRequest('/import/sources');
    return res.data || res || [];
  },
  getSourceById: async (id) => {
    const res = await apiRequest(`/import/sources/${id}`);
    return res.data || res;
  },
  createSource: async (sourceData) => {
    const res = await apiRequest('/import/sources', {
      method: 'POST',
      body: sourceData
    });
    return res.data || res;
  },
  toggleStatus: async (id) => {
    const res = await apiRequest(`/import/sources/${id}/toggle`, {
      method: 'POST'
    });
    return res.data || res;
  },
  dispatchTestEvent: async (id) => {
    const res = await apiRequest(`/import/sources/${id}/test-event`, {
      method: 'POST'
    });
    return res.data || res;
  }
};

export const bigDataApi = {
  getOverview: async () => {
    const res = await apiRequest('/analytics/big-data/overview');
    return res.data || res;
  },
  getSearchTrends: async () => {
    const res = await apiRequest('/analytics/big-data/search-trends');
    return res.data || res;
  },
  getHdfsLakeMetrics: async () => {
    const res = await apiRequest('/analytics/big-data/hdfs-lake-metrics');
    return res.data || res;
  }
};

export const fulfillmentApi = {
  searchShipments: async (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.orderId) searchParams.append('orderId', params.orderId);
    if (params.status && params.status !== 'ALL') searchParams.append('status', params.status);
    if (params.containerId) searchParams.append('containerId', params.containerId);
    if (params.search) searchParams.append('search', params.search);
    if (params.page !== undefined) searchParams.append('page', params.page);
    if (params.size !== undefined) searchParams.append('size', params.size);
    if (params.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params.sortDir) searchParams.append('sortDir', params.sortDir);

    const query = searchParams.toString();
    const res = await apiRequest(`/order-ops/shipments${query ? '?' + query : ''}`);
    return res.data || res;
  },

  getShipmentById: async (id) => {
    const res = await apiRequest(`/order-ops/shipments/${id}`);
    return res.data || res;
  },

  getShipmentsByOrderId: async (orderId) => {
    const res = await apiRequest(`/order-ops/orders/${orderId}/shipments`);
    return res.data || res || [];
  },

  createShipment: async (shipmentData) => {
    const res = await apiRequest('/order-ops/shipments', {
      method: 'POST',
      body: shipmentData
    });
    return res.data || res;
  },

  updateShipmentStatus: async (id, status) => {
    const res = await apiRequest(`/order-ops/shipments/${id}/status?status=${status}`, {
      method: 'PATCH'
    });
    return res.data || res;
  },

  updateShipmentLocation: async (id, locationData) => {
    const res = await apiRequest(`/order-ops/shipments/${id}/location`, {
      method: 'PATCH',
      body: locationData
    });
    return res.data || res;
  },

  getShipmentTracking: async (id) => {
    const res = await apiRequest(`/order-ops/shipments/${id}/tracking`);
    return res.data || res || [];
  },

  searchContainers: async (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.status && params.status !== 'ALL') searchParams.append('status', params.status);
    if (params.search) searchParams.append('search', params.search);
    if (params.page !== undefined) searchParams.append('page', params.page);
    if (params.size !== undefined) searchParams.append('size', params.size);
    if (params.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params.sortDir) searchParams.append('sortDir', params.sortDir);

    const query = searchParams.toString();
    const res = await apiRequest(`/order-ops/containers${query ? '?' + query : ''}`);
    return res.data || res;
  },

  getContainerById: async (id) => {
    const res = await apiRequest(`/order-ops/containers/${id}`);
    return res.data || res;
  },

  createContainer: async (containerData) => {
    const res = await apiRequest('/order-ops/containers', {
      method: 'POST',
      body: containerData
    });
    return res.data || res;
  },

  updateContainerStatus: async (id, status) => {
    const res = await apiRequest(`/order-ops/containers/${id}/status?status=${status}`, {
      method: 'PATCH'
    });
    return res.data || res;
  },

  updateContainerLocation: async (id, locationData) => {
    const res = await apiRequest(`/order-ops/containers/${id}/location`, {
      method: 'PATCH',
      body: locationData
    });
    return res.data || res;
  },

  assignShipmentToContainer: async (containerId, shipmentId) => {
    const res = await apiRequest(`/order-ops/containers/${containerId}/shipments/${shipmentId}`, {
      method: 'POST'
    });
    return res.data || res;
  },

  getContainerTracking: async (id) => {
    const res = await apiRequest(`/order-ops/containers/${id}/tracking`);
    return res.data || res || [];
  },

  getFulfillmentSummary: async (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.fromTime) searchParams.append('fromTime', params.fromTime);
    if (params.toTime) searchParams.append('toTime', params.toTime);

    const query = searchParams.toString();
    try {
      const res = await apiRequest(`/order-ops/fulfillment/summary${query ? '?' + query : ''}`);
      return res.data || res;
    } catch {
      const res = await apiRequest(`/order-ops/fulfillment-summary${query ? '?' + query : ''}`);
      return res.data || res;
    }
  }
};

