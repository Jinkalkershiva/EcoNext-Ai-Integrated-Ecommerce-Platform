import { apiRequest, authStore } from './client';
import { staffApi as baseStaffApi, rolesApi as baseRolesApi, authApi as baseAuthApi } from './adminApis';

// Re-export staff & role APIs
export const staffApi = {
  ...baseStaffApi,
  updateStaffRoles: async (id, roles) => {
    const res = await apiRequest(`/admin/staff/${id}`, {
      method: 'PUT',
      body: { roles }
    });
    return res.data;
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

export const catalogOpsApi = {
  getProducts: async (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.append('search', params.search);
    if (params.categoryId) searchParams.append('categoryId', params.categoryId);
    if (params.status) searchParams.append('status', params.status);
    if (params.page !== undefined) searchParams.append('page', params.page);
    if (params.size !== undefined) searchParams.append('size', params.size);

    const query = searchParams.toString();
    const res = await apiRequest(`/catalog-ops/products${query ? '?' + query : ''}`);
    return res.data;
  },

  getProductById: async (id) => {
    const res = await apiRequest(`/catalog-ops/products/${id}`);
    return res.data;
  },

  createProduct: async (productData) => {
    const res = await apiRequest('/catalog-ops/products', {
      method: 'POST',
      body: productData
    });
    return res.data;
  },

  updateProduct: async (id, productData) => {
    const res = await apiRequest(`/catalog-ops/products/${id}`, {
      method: 'PUT',
      body: productData
    });
    return res.data;
  },

  deleteProduct: async (id) => {
    const res = await apiRequest(`/catalog-ops/products/${id}`, {
      method: 'DELETE'
    });
    return res.data;
  },

  getCategories: async () => {
    const res = await apiRequest('/catalog-ops/categories');
    return res.data || [];
  },

  createCategory: async (categoryData) => {
    const res = await apiRequest('/catalog-ops/categories', {
      method: 'POST',
      body: categoryData
    });
    return res.data;
  },

  updateCategory: async (id, categoryData) => {
    const res = await apiRequest(`/catalog-ops/categories/${id}`, {
      method: 'PUT',
      body: categoryData
    });
    return res.data;
  },

  deleteCategory: async (id) => {
    const res = await apiRequest(`/catalog-ops/categories/${id}`, {
      method: 'DELETE'
    });
    return res.data;
  }
};

export const catalogApi = catalogOpsApi;

export const inventoryOpsApi = {
  getInventoryList: async () => {
    const res = await apiRequest('/catalog-ops/products?size=200');
    return res.data?.content || res.data || [];
  },

  getLowStock: async () => {
    const res = await apiRequest('/inventory-ops/low-stock');
    return res.data || [];
  },

  adjustStock: async (adjustmentData) => {
    const res = await apiRequest('/inventory-ops/adjust', {
      method: 'POST',
      body: adjustmentData
    });
    return res.data;
  },

  getSummary: async () => {
    const res = await apiRequest('/inventory-ops/summary');
    return res.data;
  },

  getProductAdjustments: async (productId, page = 0, size = 15) => {
    const res = await apiRequest(`/inventory-ops/adjustments/product/${productId}?page=${page}&size=${size}`);
    return res.data;
  }
};

export const inventoryApi = inventoryOpsApi;

export const orderOpsApi = {
  getOrders: async (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.status) searchParams.append('status', params.status);
    if (params.search) searchParams.append('search', params.search);
    if (params.page !== undefined) searchParams.append('page', params.page);
    if (params.size !== undefined) searchParams.append('size', params.size);

    const query = searchParams.toString();
    const res = await apiRequest(`/order-ops/orders${query ? '?' + query : ''}`);
    return res.data;
  },

  getOrderById: async (id) => {
    const res = await apiRequest(`/order-ops/orders/${id}`);
    return res.data;
  },

  updateOrderStatus: async (id, updateData) => {
    const res = await apiRequest(`/order-ops/orders/${id}/status`, {
      method: 'PATCH',
      body: updateData
    });
    return res.data;
  },

  getOrderTimeline: async (id) => {
    const res = await apiRequest(`/order-ops/orders/${id}/timeline`);
    return res.data || [];
  },

  getOrderSummary: async () => {
    const res = await apiRequest('/order-ops/summary');
    return res.data;
  }
};

export const orderApi = orderOpsApi;

export const dataImportApi = {
  uploadFile: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiRequest('/import/upload', {
      method: 'POST',
      body: formData,
      isFormData: true
    });
    return res.data;
  },

  previewData: async (fileId, columnMapping, checkDuplicates = true) => {
    const res = await apiRequest('/import/preview', {
      method: 'POST',
      body: { fileId, columnMapping, checkDuplicates }
    });
    return res.data;
  },

  executeImport: async (fileId, targetType, columnMapping, skipInvalidRows = true) => {
    const res = await apiRequest('/import/execute', {
      method: 'POST',
      body: { fileId, targetType, columnMapping, skipInvalidRows }
    });
    return res.data;
  },

  getJobStatus: async (id) => {
    const res = await apiRequest(`/import/jobs/${id}`);
    return res.data;
  }
};

export const importApi = dataImportApi;

export const analyticsApi = {
  getExecutiveDashboard: async () => {
    const res = await apiRequest('/analytics/dashboard');
    return res.data;
  },

  getDashboardKpis: async () => {
    const res = await apiRequest('/analytics/dashboard-kpis');
    return res.data;
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
    const res = await apiRequest(`/admin/audit${query ? '?' + query : ''}`);
    return res.data;
  },

  getRecentLogs: async () => {
    const res = await apiRequest('/admin/audit/recent');
    return res.data || [];
  },

  getStaffActivityMetrics: async () => {
    const res = await apiRequest('/admin/staff/activity-metrics');
    return res.data || [];
  }
};

export const liveSourcesApi = {
  getSources: async () => {
    const res = await apiRequest('/import/sources');
    return res.data || [];
  },
  getSourceById: async (id) => {
    const res = await apiRequest(`/import/sources/${id}`);
    return res.data;
  },
  createSource: async (sourceData) => {
    const res = await apiRequest('/import/sources', {
      method: 'POST',
      body: sourceData
    });
    return res.data;
  },
  toggleStatus: async (id) => {
    const res = await apiRequest(`/import/sources/${id}/toggle`, {
      method: 'POST'
    });
    return res.data;
  },
  dispatchTestEvent: async (id) => {
    const res = await apiRequest(`/import/sources/${id}/test-event`, {
      method: 'POST'
    });
    return res.data;
  }
};

export const bigDataApi = {
  getOverview: async () => {
    const res = await apiRequest('/analytics/big-data/overview');
    return res.data;
  },
  getSearchTrends: async () => {
    const res = await apiRequest('/analytics/big-data/search-trends');
    return res.data;
  },
  getHdfsLakeMetrics: async () => {
    const res = await apiRequest('/analytics/big-data/hdfs-lake-metrics');
    return res.data;
  }
};

