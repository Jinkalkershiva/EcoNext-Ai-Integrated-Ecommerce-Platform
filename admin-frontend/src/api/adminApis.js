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
