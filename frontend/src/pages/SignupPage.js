import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../context/NavigationContext';
import Button from '../components/common/Button';
import ErrorMessage from '../components/common/ErrorMessage';
import { Leaf, Eye, EyeOff, User, Mail, ShieldCheck, CheckCircle2 } from 'lucide-react';
import './AuthPage.css';

export const SignupPage = ({ onSignupSuccess, onSwitchPage }) => {
  const { signup } = useAuth();
  const { navigateTo } = useNavigation();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    password_confirm: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name] || errors.general) {
      setErrors(prev => ({ ...prev, [name]: '', general: '' }));
    }
  };

  const validate = () => {
    const errs = {};
    if (formData.username.length < 3) errs.username = 'Username must be at least 3 characters';
    if (!formData.email.includes('@')) errs.email = 'Valid email is required';
    if (formData.password.length < 6) errs.password = 'Password must be at least 6 characters';
    if (formData.password !== formData.password_confirm) errs.password_confirm = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    const res = await signup(formData);
    if (res.success) {
      if (onSignupSuccess) onSignupSuccess(res);
      else navigateTo('home');
    } else {
      const fieldErrors = res.fieldErrors || res.errors || {};
      const normalized = Object.entries(fieldErrors).reduce((acc, [key, val]) => {
        acc[key] = Array.isArray(val) ? val[0] : val;
        return acc;
      }, {});

      if (!normalized.general) {
        normalized.general = res.message || 'Registration failed. Please check your details.';
      }
      setErrors(normalized);
    }
    setLoading(false);
  };

  const handleGoToLogin = () => {
    if (onSwitchPage) onSwitchPage('login');
    else navigateTo('login');
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
              Join the Sustainable Revolution.
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Create your account to unlock AI-powered price intelligence, visual product search, and curated zero-waste picks.
            </p>

            <div className="auth-value-props">
              <div className="auth-prop-item">
                <CheckCircle2 size={18} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                <span>Zero greenwashing guarantee on all goods</span>
              </div>
              <div className="auth-prop-item">
                <CheckCircle2 size={18} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                <span>Linear regression 7-day price forecasting</span>
              </div>
              <div className="auth-prop-item">
                <ShieldCheck size={18} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                <span>Track your cumulative carbon emission offsets</span>
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            🌿 Fast, secure, and encrypted account creation.
          </div>
        </div>

        {/* Right Side Form */}
        <div className="auth-form-side">
          <div className="auth-form-header">
            <h1 className="auth-form-title">Create Account</h1>
            <p className="auth-form-subtitle">Enter your details to join EcoNext</p>
          </div>

          {errors.general && <ErrorMessage message={errors.general} style={{ marginBottom: '1.5rem' }} />}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="first_name">First Name</label>
                <input
                  id="first_name"
                  type="text"
                  name="first_name"
                  className="form-input"
                  placeholder="e.g. Shiva"
                  value={formData.first_name}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="last_name">Last Name</label>
                <input
                  id="last_name"
                  type="text"
                  name="last_name"
                  className="form-input"
                  placeholder="e.g. Kumar"
                  value={formData.last_name}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="username">Username *</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <User size={16} style={{ position: 'absolute', left: '1rem', color: 'var(--text-muted)' }} />
                <input
                  id="username"
                  type="text"
                  name="username"
                  className="form-input"
                  placeholder="Choose unique username"
                  value={formData.username}
                  onChange={handleChange}
                  style={{ paddingLeft: '2.5rem' }}
                  required
                />
              </div>
              {errors.username && <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem' }}>{errors.username}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="email">Email Address *</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Mail size={16} style={{ position: 'absolute', left: '1rem', color: 'var(--text-muted)' }} />
                <input
                  id="email"
                  type="email"
                  name="email"
                  className="form-input"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  style={{ paddingLeft: '2.5rem' }}
                  required
                />
              </div>
              {errors.email && <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem' }}>{errors.email}</span>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="password">Password *</label>
                <div className="password-input-wrapper">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    className="form-input"
                    placeholder="Min 6 chars"
                    value={formData.password}
                    onChange={handleChange}
                    style={{ paddingRight: '2.2rem' }}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-icon-btn"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {errors.password && <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem' }}>{errors.password}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="password_confirm">Confirm Password *</label>
                <div className="password-input-wrapper">
                  <input
                    id="password_confirm"
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="password_confirm"
                    className="form-input"
                    placeholder="Re-enter password"
                    value={formData.password_confirm}
                    onChange={handleChange}
                    style={{ paddingRight: '2.2rem' }}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-icon-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {errors.password_confirm && <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem' }}>{errors.password_confirm}</span>}
              </div>
            </div>

            <div style={{ marginTop: '1.25rem' }}>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
              >
                {loading ? 'Creating Account...' : 'Complete Sign Up'}
              </Button>
            </div>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Already have an EcoNext account?{' '}
            <button
              type="button"
              onClick={handleGoToLogin}
              style={{ color: 'var(--color-primary)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Sign in here
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
