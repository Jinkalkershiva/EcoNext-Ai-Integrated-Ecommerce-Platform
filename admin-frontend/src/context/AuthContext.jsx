import React, { createContext, useContext, useState, useEffect } from 'react';
import { authStore } from '../api/client';
import { authApi } from '../api/adminApis';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(authStore.getUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleAuthExpired = () => {
      setUser(null);
    };

    window.addEventListener('econext:admin-auth-expired', handleAuthExpired);

    // Initial session validation
    const token = authStore.getToken();
    const storedUser = authStore.getUser();

    if (token && storedUser) {
      authApi.getCurrentUser()
        .then((profile) => {
          if (profile) {
            const normalized = normalizeUserData(profile);
            setUser(normalized);
            authStore.setAuth(normalized);
          }
        })
        .catch(() => {
          authStore.clear();
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    return () => {
      window.removeEventListener('econext:admin-auth-expired', handleAuthExpired);
    };
  }, []);

  const normalizeUserData = (raw) => {
    if (!raw) return null;
    const resolvedRoles = raw.roles || (raw.role ? [raw.role] : ['ROLE_STAFF']);
    return {
      ...raw,
      fullName: raw.name || raw.fullName || raw.username,
      roles: resolvedRoles,
      role: raw.role || resolvedRoles[0],
      permissions: raw.permissions || []
    };
  };

  const login = async (username, password) => {
    try {
      const authData = await authApi.login(username, password);
      const normalized = normalizeUserData(authData);
      setUser(normalized);
      return { success: true, user: normalized };
    } catch (err) {
      return { success: false, error: err.message || 'Invalid username or password.' };
    }
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
  };

  const hasPermission = (perm) => {
    if (!user) return false;
    if (user.role === 'ROLE_ADMIN' || user.role === 'ADMIN' || user.roles?.includes('ROLE_ADMIN') || user.roles?.includes('ADMIN')) {
      return true;
    }

    const userPerms = Array.isArray(user.permissions)
      ? user.permissions.map((p) => (typeof p === 'string' ? p : p?.name || String(p)))
      : [];

    if (userPerms.includes(perm)) return true;

    // Map UI alias to backend PermissionType enum
    const permissionAliases = {
      CATALOG_VIEW: ['CATALOG_READ', 'CATALOG_CREATE', 'CATALOG_UPDATE'],
      INVENTORY_VIEW: ['INVENTORY_READ', 'INVENTORY_CREATE', 'INVENTORY_UPDATE', 'INVENTORY_ADJUST'],
      ORDER_VIEW: ['ORDER_READ', 'ORDER_PROCESS', 'ORDER_UPDATE', 'ORDER_STATUS_UPDATE'],
      STAFF_VIEW: ['STAFF_READ', 'STAFF_CREATE', 'STAFF_UPDATE'],
      STAFF_MANAGE: ['STAFF_CREATE', 'STAFF_UPDATE', 'STAFF_DISABLE'],
      ANALYTICS_VIEW: ['DATA_ANALYSIS', 'DATA_EXPORT'],
      AUDIT_VIEW: ['AUDIT_READ'],
      IMPORT_RUN: ['DATA_IMPORT']
    };

    const mapped = permissionAliases[perm];
    if (mapped && mapped.some((p) => userPerms.includes(p))) {
      return true;
    }

    // Role-based fallbacks for standard operational roles
    const userRole = (user.role || user.roles?.[0] || '').toUpperCase();
    if (userRole.includes('INVENTORY') && (perm.includes('INVENTORY') || perm === 'CATALOG_VIEW' || perm === 'IMPORT_RUN')) return true;
    if (userRole.includes('CATALOG') && (perm.includes('CATALOG') || perm === 'INVENTORY_VIEW' || perm === 'IMPORT_RUN')) return true;
    if (userRole.includes('ORDER') && (perm.includes('ORDER') || perm === 'CATALOG_VIEW')) return true;
    if (userRole.includes('DELIVERY') && perm.includes('ORDER')) return true;
    if (userRole.includes('ANALYST') && (perm.includes('ANALYTICS') || perm.includes('AUDIT') || perm.includes('DATA'))) return true;
    if (userRole.includes('DATA_ENTRY') && (perm.includes('CATALOG') || perm === 'IMPORT_RUN')) return true;

    return false;
  };

  const isAdmin = () => {
    if (!user) return false;
    return user.role === 'ROLE_ADMIN' || user.role === 'ADMIN' || user.roles?.includes('ROLE_ADMIN') || user.roles?.includes('ADMIN');
  };

  const staff = user;
  const isAuthenticated = Boolean(user);

  return (
    <AuthContext.Provider value={{ user, staff, isAuthenticated, loading, login, logout, hasPermission, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
