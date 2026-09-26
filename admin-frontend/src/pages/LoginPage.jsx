import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
    if (!username.trim() || !password.trim()) {
      setError('Please enter your username and password.');
      return;
    }

    setError('');
    setLoading(true);

    const result = await login(username.trim(), password);
    setLoading(false);

    if (result && result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result?.error || 'Authentication failed. Please verify your credentials.');
    }
  };

  const handleQuickFill = (user, pass) => {
    setUsername(user);
    setPassword(pass);
    setError('');
  };

  return (
    <div className="login-page">
      {/* Top Bar with Interactive Lamp Theme Toggle */}
      <div className="login-topbar">
        <ThemeLampToggle size="sm" />
      </div>

      <div className="login-card-container">
        {/* EcoNext Branding */}
        <div className="login-brand">
          <div className="brand-logo-circle">🌱</div>
          <h1 className="brand-title">EcoNext</h1>
          <p className="brand-subtitle">Admin & Staff Operational Portal</p>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="alert alert-danger" role="alert">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label" htmlFor="login-username">
              Username or Staff ID
            </label>
            <input
              id="login-username"
              type="text"
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin or staff_username"
              required
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">
              Password
            </label>
            <div className="password-input-wrapper">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter operational credentials"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
            style={{ marginTop: '0.75rem', height: '42px' }}
          >
            {loading ? <div className="spinner-sm"></div> : 'Authenticate & Enter Portal'}
          </button>
        </form>

        {/* Local Dev Demo Credentials */}
        <div className="quick-access-box">
          <p className="quick-access-title">Default Development Credentials:</p>
          <div className="quick-access-buttons">
            <button
              type="button"
              className="btn btn-secondary btn-xs"
              onClick={() => handleQuickFill('admin', 'Admin@12345')}
            >
              Root Admin (admin / Admin@12345)
            </button>
          </div>
        </div>

        {/* Protected Notice */}
        <div className="login-footer-text">
          <p><strong>Protected internal platform.</strong> Authorized staff access only.</p>
          <p className="sub-text">Connected to EcoNext Java Spring Boot Microservices Core</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
