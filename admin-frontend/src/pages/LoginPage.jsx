import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Leaf, AlertCircle, Eye, EyeOff, Shield, Server, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ThemeLampToggle } from '../components/ThemeLampToggle';

export const LoginPage = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin@12345');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!username.trim() || !password.trim()) {
      setError('Please enter your username and password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const result = await login(username.trim(), password);
      if (result && result.success) {
        navigate(from, { replace: true });
      } else {
        setError(result?.error || 'Invalid username or password.');
      }
    } catch (err) {
      setError(err?.message || 'Unable to connect to the authentication service.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Top Bar with Discrete Theme Toggle */}
      <header className="login-topbar">
        <div className="login-topbar-brand">
          <Leaf size={18} className="text-emerald-500" />
          <span className="login-topbar-title">EcoNext Operations</span>
        </div>
        <ThemeLampToggle size="sm" />
      </header>

      {/* Main Centered Login Card */}
      <main className="login-main">
        <div className="login-card">
          {/* Brand Header */}
          <div className="login-header">
            <div className="login-badge-icon">
              <Leaf size={28} className="text-emerald-500" />
            </div>
            <h1 className="login-title">EcoNext</h1>
            <p className="login-subtitle">Admin & Staff Operational Portal</p>
            <p className="login-desc">
              Sign in to access platform governance, warehouse fulfillment, and logistics telemetry.
            </p>
          </div>

          {/* Error Alert Box */}
          {error && (
            <div className="login-error-alert" role="alert" aria-live="polite">
              <AlertCircle size={18} className="login-error-icon" />
              <div className="login-error-text">{error}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="login-form" noValidate>
            <div className="login-field">
              <label className="login-label" htmlFor="login-username">
                Username or Staff ID
              </label>
              <div className="login-input-wrapper">
                <input
                  id="login-username"
                  type="text"
                  className="login-input"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Enter your username or staff ID"
                  required
                  autoComplete="username"
                  autoFocus
                  disabled={loading}
                />
              </div>
            </div>

            <div className="login-field">
              <div className="login-label-row">
                <label className="login-label" htmlFor="login-password">
                  Password
                </label>
              </div>
              <div className="login-input-wrapper">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="login-input login-input-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Enter your operational password"
                  required
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="login-submit-btn"
              disabled={loading || !username.trim() || !password.trim()}
            >
              {loading ? (
                <span className="login-btn-loading">
                  <span className="login-spinner"></span>
                  <span>Signing in...</span>
                </span>
              ) : (
                <span className="login-btn-content">
                  <Lock size={16} />
                  <span>Sign In</span>
                </span>
              )}
            </button>
          </form>

          {/* Development / Support Guidance Notice */}
          <div className="login-guide-box">
            <div className="login-guide-title">
              <Shield size={14} className="text-emerald-500" />
              <span>Authorized Enterprise Access</span>
            </div>
            <p className="login-guide-text">
              Use your assigned operational credentials. If you need account provisioning or role modifications, contact your system administrator.
            </p>
          </div>

          {/* Platform Security Footer */}
          <footer className="login-footer">
            <div className="login-security-badge">
              <Shield size={13} />
              <span>Protected internal platform. Authorized staff access only.</span>
            </div>
            <div className="login-backend-badge">
              <Server size={13} />
              <span>Connected to EcoNext Java Spring Boot & Django Microservices Core</span>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
