import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../context/NavigationContext';
import Button from '../components/common/Button';
import ErrorMessage from '../components/common/ErrorMessage';
import { Leaf, Eye, EyeOff, Lock, User, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import './AuthPage.css';

export const LoginPage = ({ onLoginSuccess, onSwitchPage }) => {
  const { login } = useAuth();
  const { navigateTo } = useNavigation();

  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await login(credentials);
    if (res.success) {
      if (onLoginSuccess) onLoginSuccess(res);
      else navigateTo('home');
    } else {
      setError(res.message || 'Invalid username or password.');
    }
    setLoading(false);
  };

  const handleGoToSignup = () => {
    if (onSwitchPage) onSwitchPage('signup');
    else navigateTo('signup');
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-container-card">
        {/* Left Side Branding */}
        <div className="auth-side-branding">
          <div>
            <div className="auth-brand-logo">
              <div className="navbar-brand-icon">
                <Leaf size={20} />
              </div>
              <span>EcoNext</span>
            </div>

            <h2 style={{ fontSize: '1.45rem', marginTop: '1.5rem', lineHeight: 1.25 }}>
              Welcome back to conscious shopping.
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Sign in to manage your sustainable orders, view personalized eco-deals, and track carbon offsets.
            </p>

            <div className="auth-value-props">
              <div className="auth-prop-item">
                <Sparkles size={18} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
                <span>Real-time Linear Regression price alerts</span>
              </div>
              <div className="auth-prop-item">
                <CheckCircle2 size={18} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                <span>100% verified sustainable merchants</span>
              </div>
              <div className="auth-prop-item">
                <ShieldCheck size={18} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                <span>Carbon-neutral zero-waste packaging</span>
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            🌱 Over 50,000 conscious consumers shopping sustainably.
          </div>
        </div>

        {/* Right Side Form */}
        <div className="auth-form-side">
          <div className="auth-form-header">
            <h1 className="auth-form-title">Sign In</h1>
            <p className="auth-form-subtitle">Enter your credentials to access your EcoNext account</p>
          </div>

          {error && <ErrorMessage message={error} style={{ marginBottom: '1.5rem' }} />}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="username">Username</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <User size={16} style={{ position: 'absolute', left: '1rem', color: 'var(--text-muted)' }} />
                <input
                  id="username"
                  type="text"
                  name="username"
                  className="form-input"
                  placeholder="Enter your username"
                  value={credentials.username}
                  onChange={handleChange}
                  style={{ paddingLeft: '2.5rem' }}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" htmlFor="password">Password</label>
                <button
                  type="button"
                  onClick={handleGoToSignup}
                  style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Forgot password?
                </button>
              </div>
              <div className="password-input-wrapper">
                <Lock size={16} style={{ position: 'absolute', left: '1rem', color: 'var(--text-muted)' }} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className="form-input"
                  placeholder="Enter your password"
                  value={credentials.password}
                  onChange={handleChange}
                  style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle-icon-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '1rem 0 1.5rem 0' }}>
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ accentColor: 'var(--color-primary)', width: '16px', height: '16px' }}
              />
              <label htmlFor="rememberMe" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Keep me signed in on this device
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </Button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Don't have an EcoNext account?{' '}
            <button
              type="button"
              onClick={handleGoToSignup}
              style={{ color: 'var(--color-primary)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Create one now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
