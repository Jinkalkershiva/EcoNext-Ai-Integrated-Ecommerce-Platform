import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Leaf, AlertTriangle, Eye, EyeOff, ShieldCheck } from 'lucide-react';
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
          <div className="brand-logo-circle bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <Leaf size={28} />
          </div>
          <h1 className="brand-title">EcoNext</h1>
          <p className="brand-subtitle">Admin & Staff Operational Portal</p>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="alert alert-danger flex items-center gap-2" role="alert">
            <AlertTriangle size={18} className="flex-shrink-0" />
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
            <div className="password-input-wrapper relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="input pr-10"
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
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
          <p className="sub-text">Connected to EcoNext Java Spring Boot & Django Microservices Core</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
