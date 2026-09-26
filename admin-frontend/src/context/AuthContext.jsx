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
    return {
      ...raw,
      fullName: raw.name || raw.fullName || raw.username,
      roles: raw.roles || (raw.role ? [raw.role] : ['ROLE_STAFF']),
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
    if (user.role === 'ROLE_ADMIN' || user.role === 'ADMIN' || user.roles?.includes('ROLE_ADMIN')) return true;
    if (!user.permissions) return false;
    return user.permissions.includes(perm);
  };

  const isAdmin = () => {
    if (!user) return false;
    return user.role === 'ROLE_ADMIN' || user.role === 'ADMIN' || user.roles?.includes('ROLE_ADMIN');
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
