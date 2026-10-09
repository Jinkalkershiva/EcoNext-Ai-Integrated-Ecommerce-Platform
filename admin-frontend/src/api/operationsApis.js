import { apiRequest, authStore } from './client';
import { 
  staffApi as baseStaffApi, 
  rolesApi as baseRolesApi, 
  authApi as baseAuthApi,
  databaseQueryApi as baseDatabaseQueryApi,
  bulkImportApi as baseBulkImportApi
} from './adminApis';

// Re-export staff & role APIs with dual route fallback
export const staffApi = {
  ...baseStaffApi,
  getAllStaff: async () => {
    try {
      const res = await apiRequest('/admin/staff/');
      return res.data || (Array.isArray(res) ? res : res?.content || []);
    } catch {
      const res = await apiRequest('/admin/staff');
      return res.data || (Array.isArray(res) ? res : res?.content || []);
    }
  },
  getStaffById: async (id) => {
    try {
      const res = await apiRequest(`/admin/staff/${id}/`);
      return res.data || res;
    } catch {
      const res = await apiRequest(`/admin/staff/${id}`);
      return res.data || res;
    }
  },
  createStaff: async (staffData) => {
    try {
      const res = await apiRequest('/admin/staff/', {
        method: 'POST',
        body: staffData
      });
      return res.data || res;
    } catch {
      const res = await apiRequest('/admin/staff', {
        method: 'POST',
        body: staffData
      });
      return res.data || res;
    }
  },
  updateStaff: async (id, staffData) => {
    try {
      const res = await apiRequest(`/admin/staff/${id}/`, {
        method: 'PATCH',
        body: staffData
      });
      return res.data || res;
    } catch {
      const res = await apiRequest(`/admin/staff/${id}`, {
        method: 'PUT',
        body: staffData
      });
      return res.data || res;
    }
  },
  updateStaffRoles: async (id, roles) => {
    try {
      const res = await apiRequest(`/admin/staff/${id}/`, {
        method: 'PATCH',
        body: { roles, roleName: Array.isArray(roles) ? roles[0] : roles }
      });
      return res.data || res;
    } catch {
      const res = await apiRequest(`/admin/staff/${id}`, {
        method: 'PUT',
        body: { roles }
      });
      return res.data || res;
    }
  },
  updateStaffStatus: async (id, status) => {
    try {
      const res = await apiRequest(`/admin/staff/${id}/status/`, {
        method: 'PATCH',
        body: { status }
      });
      return res.data || res;
    } catch {
      return baseStaffApi.updateStatus(id, status);
    }
  },
  resetPassword: async (id, newPassword) => {
    try {
      const res = await apiRequest(`/admin/staff/${id}/reset-password/`, {
        method: 'POST',
        body: { newPassword, password: newPassword }
      });
      return res.data || res;
    } catch {
      return baseStaffApi.resetPassword(id, newPassword);
    }
  },
  deleteStaff: async (id) => {
    try {
      const res = await apiRequest(`/admin/staff/${id}/`, {
        method: 'DELETE'
      });
      return res.data || res;
    } catch {
      return baseStaffApi.deleteStaff(id);
    }
  }
};

export const departmentApi = {
  getAllDepartments: async () => {
    try {
      const res = await apiRequest('/admin/departments/');
      return res.data || (Array.isArray(res) ? res : []);
    } catch {
      try {
        const res = await apiRequest('/admin/departments');
        return res.data || (Array.isArray(res) ? res : []);
      } catch {
        return [];
      }
    }
  }
};

export const roleApi = {
  ...baseRolesApi,
  getAllRoles: async () => {
    try {
      const res = await apiRequest('/admin/roles/');
      return res.data || (Array.isArray(res) ? res : res?.content || []);
    } catch {
      const res = await apiRequest('/admin/roles');
      return res.data || (Array.isArray(res) ? res : res?.content || []);
    }
  }
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

  toggleWhitelist: async (id, isWhitelisted) => {
    try {
      const res = await apiRequest(`/admin/products/${id}/whitelist/`, {
        method: 'POST',
        body: { is_whitelisted: isWhitelisted }
      });
      return res.product || res.data || res;
    } catch {
      const res = await apiRequest(`/admin/products/${id}/`, {
        method: 'PATCH',
        body: { is_whitelisted: isWhitelisted }
      });
      return res.product || res.data || res;
    }
  },

  archiveProduct: async (id) => {
    try {
      const res = await apiRequest(`/admin/products/${id}/archive/`, {
        method: 'POST'
      });
      return res.product || res.data || res;
    } catch {
      const res = await apiRequest(`/admin/products/${id}/`, {
        method: 'PATCH',
        body: { status: 'ARCHIVED' }
      });
      return res.product || res.data || res;
    }
  },

  restoreProduct: async (id) => {
    try {
      const res = await apiRequest(`/admin/products/${id}/restore/`, {
        method: 'POST'
      });
      return res.product || res.data || res;
    } catch {
      const res = await apiRequest(`/admin/products/${id}/`, {
        method: 'PATCH',
        body: { status: 'ACTIVE' }
      });
      return res.product || res.data || res;
    }
  },

  searchProductImages: async (query = '', category = '') => {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (category) params.append('category', category);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    try {
      const res = await apiRequest(`/admin/products/image-search/${queryString}`);
      return res.results || res.data || res || [];
    } catch {
      const res = await apiRequest(`/catalog-ops/products/image-search${queryString}`);
      return res.data || res || [];
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

  cancelOrder: async (id, reason = '') => {
    try {
      const res = await apiRequest(`/admin/orders/${id}/cancel/`, {
        method: 'POST',
        body: { reason }
      });
      return res.order || res.data || res;
    } catch {
      const res = await apiRequest(`/order-ops/orders/${id}/cancel?reason=${encodeURIComponent(reason)}`, {
        method: 'POST'
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

  getOrderDeliveryAudits: async (id) => {
    try {
      const res = await apiRequest(`/order-ops/orders/${id}/delivery-audits`);
      return res.data || res || [];
    } catch {
      return [];
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

export const returnsApi = {
  getAllReturns: async () => {
    try {
      const res = await apiRequest('/admin/returns/');
      return res.returns || res.data || [];
    } catch {
      const res = await apiRequest('/order-ops/returns');
      return res.data || res || [];
    }
  },

  getReturnsByOrderId: async (orderId) => {
    try {
      const res = await apiRequest(`/orders/${orderId}/returns/`);
      return res.returns || res.data || [];
    } catch {
      const res = await apiRequest(`/order-ops/orders/${orderId}/returns`);
      return res.data || res || [];
    }
  },

  approveReturn: async (id, note = '') => {
    try {
      const res = await apiRequest(`/admin/returns/${id}/approve/`, {
        method: 'POST',
        body: { note }
      });
      return res.return_request || res.return || res.data || res;
    } catch (adminErr) {
      try {
        const res = await apiRequest(`/orders/returns/${id}/approve/`, {
          method: 'POST',
          body: { note }
        });
        return res.return_request || res.return || res.data || res;
      } catch (orderErr) {
        try {
          const res = await apiRequest(`/order-ops/returns/${id}/approve`, {
            method: 'POST',
            body: { note }
          });
          return res.data || res;
        } catch {
          throw adminErr;
        }
      }
    }
  },

  rejectReturn: async (id, rejectionReason) => {
    try {
      const res = await apiRequest(`/admin/returns/${id}/reject/`, {
        method: 'POST',
        body: { rejection_reason: rejectionReason, rejectionReason }
      });
      return res.return_request || res.return || res.data || res;
    } catch (adminErr) {
      try {
        const res = await apiRequest(`/orders/returns/${id}/reject/`, {
          method: 'POST',
          body: { rejection_reason: rejectionReason, rejectionReason }
        });
        return res.return_request || res.return || res.data || res;
      } catch (orderErr) {
        try {
          const res = await apiRequest(`/order-ops/returns/${id}/reject`, {
            method: 'POST',
            body: { rejectionReason }
          });
          return res.data || res;
        } catch {
          throw adminErr;
        }
      }
    }
  },

  receiveReturn: async (id, note = '') => {
    try {
      const res = await apiRequest(`/admin/returns/${id}/receive/`, {
        method: 'POST',
        body: { note }
      });
      return res.return_request || res.return || res.data || res;
    } catch (adminErr) {
      try {
        const res = await apiRequest(`/orders/returns/${id}/receive/`, {
          method: 'POST',
          body: { note }
        });
        return res.return_request || res.return || res.data || res;
      } catch (orderErr) {
        try {
          const res = await apiRequest(`/order-ops/returns/${id}/receive`, {
            method: 'POST',
            body: { note }
          });
          return res.data || res;
        } catch {
          throw adminErr;
        }
      }
    }
  },

  schedulePickup: async (id, payload = {}) => {
    try {
      const res = await apiRequest(`/admin/returns/${id}/schedule-pickup/`, {
        method: 'POST',
        body: payload
      });
      return res.return_request || res.return || res.data || res;
    } catch {
      const res = await apiRequest(`/orders/returns/${id}/schedule-pickup/`, {
        method: 'POST',
        body: payload
      });
      return res.return_request || res.return || res.data || res;
    }
  },

  confirmPickup: async (id, payload = {}) => {
    try {
      const res = await apiRequest(`/admin/returns/${id}/confirm-pickup/`, {
        method: 'POST',
        body: payload
      });
      return res.return_request || res.return || res.data || res;
    } catch {
      const res = await apiRequest(`/orders/returns/${id}/confirm-pickup/`, {
        method: 'POST',
        body: payload
      });
      return res.return_request || res.return || res.data || res;
    }
  },

  updateTransit: async (id, payload = {}) => {
    try {
      const res = await apiRequest(`/admin/returns/${id}/transit/`, {
        method: 'POST',
        body: payload
      });
      return res.return_request || res.return || res.data || res;
    } catch {
      const res = await apiRequest(`/orders/returns/${id}/transit/`, {
        method: 'POST',
        body: payload
      });
      return res.return_request || res.return || res.data || res;
    }
  },

  inspectReturn: async (id, payload = {}) => {
    try {
      const res = await apiRequest(`/admin/returns/${id}/inspect/`, {
        method: 'POST',
        body: payload
      });
      return res.return_request || res.return || res.data || res;
    } catch {
      const res = await apiRequest(`/orders/returns/${id}/inspect/`, {
        method: 'POST',
        body: payload
      });
      return res.return_request || res.return || res.data || res;
    }
  },

  cancelReturn: async (id, reason = '') => {
    try {
      const res = await apiRequest(`/admin/returns/${id}/cancel/`, {
        method: 'POST',
        body: { reason }
      });
      return res.return_request || res.return || res.data || res;
    } catch (adminErr) {
      const res = await apiRequest(`/orders/returns/${id}/cancel/`, {
        method: 'POST',
        body: { reason }
      });
      return res.return_request || res.return || res.data || res;
    }
  }
};

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
  },

  getRefunds: async (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.orderId) searchParams.append('orderId', params.orderId);
    if (params.page !== undefined) searchParams.append('page', params.page);
    if (params.size !== undefined) searchParams.append('size', params.size);

    const query = searchParams.toString();
    try {
      const res = await apiRequest(`/payments/refunds${query ? '?' + query : ''}`);
      return res.data?.content || res.data || res || [];
    } catch {
      return [];
    }
  },

  retryRefund: async (refundId) => {
    const res = await apiRequest(`/payments/refunds/${refundId}/retry`, {
      method: 'POST'
    });
    return res.data || res;
  },

  recordCodPayout: async (refundId, payload = {}) => {
    const res = await apiRequest(`/admin/refunds/${refundId}/payout/`, {
      method: 'POST',
      body: payload
    });
    return res.data || res;
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

export const fulfillmentApi = {
  searchShipments: async (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.orderId) searchParams.append('orderId', params.orderId);
    if (params.status && params.status !== 'ALL') searchParams.append('status', params.status);
    if (params.containerId) searchParams.append('containerId', params.containerId);
    if (params.warehouse) searchParams.append('warehouse', params.warehouse);
    if (params.hub) searchParams.append('hub', params.hub);
    if (params.state) searchParams.append('state', params.state);
    if (params.city) searchParams.append('city', params.city);
    if (params.pincode) searchParams.append('pincode', params.pincode);
    if (params.carrier) searchParams.append('carrier', params.carrier);
    if (params.fromTime) searchParams.append('fromTime', params.fromTime);
    if (params.toTime) searchParams.append('toTime', params.toTime);
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

  assignOrderToShipment: async (shipmentId, orderId, routeException = false, exceptionReason = '') => {
    const res = await apiRequest(`/order-ops/shipments/${shipmentId}/orders`, {
      method: 'POST',
      body: { orderId, routeException, exceptionReason }
    });
    return res.data || res;
  },

  removeOrderFromShipment: async (shipmentId, orderId) => {
    const res = await apiRequest(`/order-ops/shipments/${shipmentId}/orders/${orderId}`, {
      method: 'DELETE'
    });
    return res.data || res;
  },

  markShipmentFull: async (shipmentId) => {
    const res = await apiRequest(`/order-ops/shipments/${shipmentId}/mark-full`, {
      method: 'POST'
    });
    return res.data || res;
  },

  dispatchShipment: async (shipmentId) => {
    const res = await apiRequest(`/order-ops/shipments/${shipmentId}/dispatch`, {
      method: 'POST'
    });
    return res.data || res;
  },

  getRouteExceptions: async (shipmentId) => {
    const res = await apiRequest(`/order-ops/shipments/${shipmentId}/route-exceptions`);
    return res.data || res || [];
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

  getShipmentEvents: async (id) => {
    const res = await apiRequest(`/order-ops/shipments/${id}/events`);
    return res.data || res || [];
  },

  sendDeliveryOtp: async (shipmentId) => {
    const res = await apiRequest(`/order-ops/shipments/${shipmentId}/delivery-otp/send`, {
      method: 'POST'
    });
    return res.data || res;
  },

  verifyDeliveryOtp: async (shipmentId, otp) => {
    const res = await apiRequest(`/order-ops/shipments/${shipmentId}/delivery-otp/verify`, {
      method: 'POST',
      body: { otp }
    });
    return res.data || res;
  },

  getDeliveryOtpStatus: async (shipmentId) => {
    const res = await apiRequest(`/order-ops/shipments/${shipmentId}/delivery-otp/status`);
    return res.data || res;
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

  getCompatibleShipments: async (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.orderId) searchParams.append('orderId', params.orderId);
    if (params.orderIds && Array.isArray(params.orderIds)) {
      params.orderIds.forEach(id => searchParams.append('orderIds', id));
    } else if (params.orderIds) {
      searchParams.append('orderIds', params.orderIds);
    }
    if (params.warehouse) searchParams.append('warehouse', params.warehouse);
    if (params.destination) searchParams.append('destination', params.destination);

    const query = searchParams.toString();
    const res = await apiRequest(`/order-ops/shipments/compatible${query ? '?' + query : ''}`);
    return res.data || res || [];
  },

  batchAssignOrdersToShipment: async (shipmentId, payload = {}) => {
    const res = await apiRequest(`/order-ops/shipments/${shipmentId}/batch-assign`, {
      method: 'POST',
      body: payload
    });
    return res.data || res;
  },

  assignDriverAndTruck: async (shipmentId, payload = {}) => {
    const res = await apiRequest(`/order-ops/shipments/${shipmentId}/assign-driver-truck`, {
      method: 'POST',
      body: payload
    });
    return res.data || res;
  },

  getDrivers: async (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.warehouse && params.warehouse !== 'All Warehouses') searchParams.append('warehouse', params.warehouse);
    if (params.status && params.status !== 'ALL') searchParams.append('status', params.status);
    if (params.search) searchParams.append('search', params.search);

    const query = searchParams.toString();
    const res = await apiRequest(`/order-ops/drivers${query ? '?' + query : ''}`);
    return res.data || res || [];
  },

  getAvailableDrivers: async (warehouse = '') => {
    const searchParams = new URLSearchParams();
    if (warehouse && warehouse !== 'All Warehouses') searchParams.append('warehouse', warehouse);
    const query = searchParams.toString();
    const res = await apiRequest(`/order-ops/drivers/available${query ? '?' + query : ''}`);
    return res.data || res || [];
  },

  createDriver: async (driverData) => {
    const res = await apiRequest('/order-ops/drivers', {
      method: 'POST',
      body: driverData
    });
    return res.data || res;
  },

  updateDriverStatus: async (driverId, status) => {
    const res = await apiRequest(`/order-ops/drivers/${driverId}/status?status=${status}`, {
      method: 'PATCH'
    });
    return res.data || res;
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

export const driverApi = {
  getTasks: async () => {
    const res = await apiRequest('/driver/tasks');
    return res.data || res;
  },

  updateTaskStatus: async (taskId, payload = {}) => {
    const res = await apiRequest(`/driver/tasks/${taskId}/status`, {
      method: 'POST',
      body: payload
    });
    return res.data || res;
  }
};

