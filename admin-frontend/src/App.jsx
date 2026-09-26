import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AdminLayout } from './components/AdminLayout';

// Pages
import { LoginPage } from './pages/LoginPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { DashboardPage } from './pages/DashboardPage';
import { StaffManagementPage } from './pages/StaffManagementPage';
import { RolesPermissionsPage } from './pages/RolesPermissionsPage';
import { ProductsPage } from './pages/ProductsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { InventoryPage } from './pages/InventoryPage';
import { OrdersPage } from './pages/OrdersPage';
import { ImportWizardPage } from './pages/ImportWizardPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import LiveSourcesPage from './pages/LiveSourcesPage';
import BigDataAnalyticsPage from './pages/BigDataAnalyticsPage';

// Protected Route Wrapper
const ProtectedRoute = ({ children, requiredPermission = null }) => {
  const { isAuthenticated, loading, hasPermission, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="full-screen-loader">
        <div className="spinner"></div>
        <p className="mt-3 text-muted">Verifying staff operational authorization...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredPermission && !isAdmin() && !hasPermission(requiredPermission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route
                path="staff"
                element={
                  <ProtectedRoute requiredPermission="STAFF_VIEW">
                    <StaffManagementPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="roles"
                element={
                  <ProtectedRoute requiredPermission="STAFF_MANAGE">
                    <RolesPermissionsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="products"
                element={
                  <ProtectedRoute requiredPermission="CATALOG_VIEW">
                    <ProductsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="categories"
                element={
                  <ProtectedRoute requiredPermission="CATALOG_VIEW">
                    <CategoriesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="inventory"
                element={
                  <ProtectedRoute requiredPermission="INVENTORY_VIEW">
                    <InventoryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="orders"
                element={
                  <ProtectedRoute requiredPermission="ORDER_VIEW">
                    <OrdersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="import"
                element={
                  <ProtectedRoute requiredPermission="IMPORT_RUN">
                    <ImportWizardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="sources"
                element={
                  <ProtectedRoute requiredPermission="IMPORT_RUN">
                    <LiveSourcesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="big-data"
                element={
                  <ProtectedRoute requiredPermission="ANALYTICS_VIEW">
                    <BigDataAnalyticsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="analytics"
                element={
                  <ProtectedRoute requiredPermission="ANALYTICS_VIEW">
                    <AnalyticsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="audit-logs"
                element={
                  <ProtectedRoute requiredPermission="AUDIT_VIEW">
                    <AuditLogsPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
