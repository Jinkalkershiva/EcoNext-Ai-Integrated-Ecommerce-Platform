import { apiRequest, authStore } from './client';

export const authApi = {
  login: async (username, password) => {
    const res = await apiRequest('/admin/auth/login', {
      method: 'POST',
      body: { username, password },
      auth: false
    });
    if (res?.data) {
      authStore.setAuth(res.data);
    }
    return res.data;
  },

  getCurrentUser: async () => {
    const res = await apiRequest('/admin/auth/me');
    return res.data;
  },

  logout: () => {
    authStore.clear();
  }
};

export const staffApi = {
  getAllStaff: async () => {
    const res = await apiRequest('/admin/staff');
    return res.data || [];
  },

  getStaffById: async (id) => {
    const res = await apiRequest(`/admin/staff/${id}`);
    return res.data;
  },

  createStaff: async (staffData) => {
    const res = await apiRequest('/admin/staff', {
      method: 'POST',
      body: staffData
    });
    return res.data;
  },

  updateStaff: async (id, staffData) => {
    const res = await apiRequest(`/admin/staff/${id}`, {
      method: 'PUT',
      body: staffData
    });
    return res.data;
  },

  updateStatus: async (id, status) => {
    const res = await apiRequest(`/admin/staff/${id}/status`, {
      method: 'PATCH',
      body: { status }
    });
    return res.data;
  },

  resetPassword: async (id, newPassword) => {
    const res = await apiRequest(`/admin/staff/${id}/reset-password`, {
      method: 'POST',
      body: { newPassword }
    });
    return res.data;
  },

  deleteStaff: async (id) => {
    const res = await apiRequest(`/admin/staff/${id}`, {
      method: 'DELETE'
    });
    return res.data;
  }
};

export const rolesApi = {
  getAllRoles: async () => {
    const res = await apiRequest('/admin/roles');
    return res.data || [];
  },

  getRoleById: async (id) => {
    const res = await apiRequest(`/admin/roles/${id}`);
    return res.data;
  },

  createRole: async (roleData) => {
    const res = await apiRequest('/admin/roles', {
      method: 'POST',
      body: roleData
    });
    return res.data;
  },

  updateRole: async (id, roleData) => {
    const res = await apiRequest(`/admin/roles/${id}`, {
      method: 'PUT',
      body: roleData
    });
    return res.data;
  },

  deleteRole: async (id) => {
    const res = await apiRequest(`/admin/roles/${id}`, {
      method: 'DELETE'
    });
    return res.data;
  },

  getAllPermissions: async () => {
    const res = await apiRequest('/admin/permissions');
    return res.data || [];
  }
};

export const databaseQueryApi = {
  executeQuery: async (query, database = 'econext') => {
    try {
      const res = await apiRequest('/admin/database/query/', {
        method: 'POST',
        body: { query, database }
      });
      return res.data || res;
    } catch (err) {
      const res = await apiRequest('/admin/database/query', {
        method: 'POST',
        body: { query, database }
      });
      return res.data || res;
    }
  },

  getQueryHistory: async () => {
    try {
      const res = await apiRequest('/admin/database/query/history/');
      return res.history || res.data || [];
    } catch {
      const res = await apiRequest('/admin/database/query/history');
      return res.history || res.data || [];
    }
  },

  getDatabaseSchema: async () => {
    try {
      const res = await apiRequest('/admin/database/schema/');
      return res.schema || res.data || {};
    } catch {
      const res = await apiRequest('/admin/database/schema');
      return res.schema || res.data || {};
    }
  }
};

export const bulkImportApi = {
  validateProducts: async (rows, checkDuplicates = true) => {
    try {
      const res = await apiRequest('/admin/products/import/validate/', {
        method: 'POST',
        body: { rows, checkDuplicates }
      });
      return res.data || res;
    } catch {
      const res = await apiRequest('/admin/products/import/validate', {
        method: 'POST',
        body: { rows, checkDuplicates }
      });
      return res.data || res;
    }
  },

  executeImport: async (rows, filename = 'bulk_products_import.csv') => {
    try {
      const res = await apiRequest('/admin/products/import/execute/', {
        method: 'POST',
        body: { rows, filename }
      });
      return res.data || res;
    } catch {
      const res = await apiRequest('/admin/products/import/execute', {
        method: 'POST',
        body: { rows, filename }
      });
      return res.data || res;
    }
  }
};

