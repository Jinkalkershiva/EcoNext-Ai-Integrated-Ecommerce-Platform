import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiService, tokenStore, AUTH_EXPIRED_EVENT } from '../api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => tokenStore.getUser());
  const [authToken, setAuthToken] = useState(() => tokenStore.getAccess());
  const [loading, setLoading] = useState(false);

  // Sync state if auth expires from 401
  useEffect(() => {
    const handleAuthExpired = () => {
      setUser(null);
      setAuthToken(null);
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
  }, []);

  // Check current user details from API on boot if token exists
  useEffect(() => {
    const verifySession = async () => {
      if (tokenStore.isAuthenticated()) {
        try {
          const data = await apiService.getCurrentUser();
          if (data && data.user) {
            setUser(data.user);
            tokenStore.setUser(data.user);
          }
        } catch (err) {
          // If network error, keep local storage user; if 401, tokenStore handles refresh
          console.warn('Session check note:', err.message);
        }
      }
    };
    verifySession();
  }, []);

  const login = useCallback(async (credentials) => {
    setLoading(true);
    try {
      const response = await apiService.login(credentials);
      if (response && response.status === 'success') {
        setUser(response.user);
        setAuthToken(response.tokens?.access || tokenStore.getAccess());
        return { success: true, user: response.user };
      }
      return { success: false, message: response?.message || 'Login failed' };
    } catch (error) {
      return { success: false, message: error.message || 'Invalid credentials' };
    } finally {
      setLoading(false);
    }
  }, []);

  const signup = useCallback(async (userData) => {
    setLoading(true);
    try {
      const response = await apiService.signup(userData);
      if (response && response.status === 'success') {
        setUser(response.user);
        setAuthToken(response.tokens?.access || tokenStore.getAccess());
        return { success: true, user: response.user };
      }
      return { 
        success: false, 
        message: response?.message || 'Signup failed',
        errors: response?.errors
      };
    } catch (error) {
      return { 
        success: false, 
        message: error.message || 'Signup failed',
        fieldErrors: error.fieldErrors
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await apiService.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      setAuthToken(null);
      setLoading(false);
    }
  }, []);

  const updateUser = useCallback((updatedUserData) => {
    setUser(prev => {
      const updated = { ...prev, ...updatedUserData };
      tokenStore.setUser(updated);
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      authToken,
      isAuthenticated: Boolean(authToken || user),
      loading,
      login,
      signup,
      logout,
      updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
