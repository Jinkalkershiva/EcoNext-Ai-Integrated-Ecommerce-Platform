import React, { useState } from 'react';
import {
  Settings,
  Palette,
  Moon,
  Flame,
  Sun,
  ShieldCheck,
  Bell,
  CheckCircle2,
  Server,
  Database,
  Globe,
  Mail,
  Smartphone,
  Save,
  Check
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const SettingsPage = () => {
  const { theme, setTheme } = useTheme();
  const [saved, setSaved] = useState(false);

  const [storeConfig, setStoreConfig] = useState({
    storeName: 'EcoNext Sustainable Marketplace',
    supportEmail: 'ops@econext.earth',
    currency: 'INR (₹)',
    carbonOffsetPerOrder: '2.5 kg CO₂e',
    emailNotificationsEnabled: true,
    smsNotificationsEnabled: true,
    autoFulfillmentSlaHours: '24'
  });

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const themes = [
    {
      id: 'colorful',
      name: 'Colorful & Vibrant Mode',
      desc: 'Modern, high-contrast enterprise palette with vibrant emerald and indigo accents.',
      icon: Palette,
      previewBg: 'linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 50%, #faf5ff 100%)',
      accentColor: '#10b981'
    },
    {
      id: 'dark',
      name: 'Deep Obsidian Dark Mode',
      desc: 'Deep charcoal background, elevated card surfaces, and glowing accent indicators.',
      icon: Moon,
      previewBg: 'linear-gradient(135deg, #090d16 0%, #0f172a 100%)',
      accentColor: '#38bdf8'
    },
    {
      id: 'warm',
      name: 'Warm Sunset Amber Mode',
      desc: 'Cozy warm beige, cream surfaces, and rich amber/terracotta accents.',
      icon: Flame,
      previewBg: 'linear-gradient(135deg, #fefcf6 0%, #fef3c7 50%, #ffedd5 100%)',
      accentColor: '#d97706'
    }
  ];

  return (
    <div className="settings-page">
      {saved && (
        <div className="alert alert-success mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} />
            <span>Store configuration settings successfully updated!</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="page-header-flex mb-4">
        <div>
          <h2 className="page-title flex items-center gap-2">
            <Settings size={24} className="text-primary" />
            <span>Admin Settings & Visual Appearance</span>
          </h2>
          <p className="page-subtitle">
            Configure visual themes, store operation parameters, notification channels, and telemetry.
          </p>
        </div>
      </div>

      {/* 3-Mode Theme Selector */}
      <div className="card p-5 mb-5">
        <h3 className="section-title flex items-center gap-2 mb-3">
          <Palette size={18} className="text-primary" />
          <span>Visual Theme System</span>
        </h3>
        <p className="text-sm text-muted mb-4">
          Choose your preferred interface theme. Selected theme is automatically persisted to local storage.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {themes.map((t) => {
            const Icon = t.icon;
            const isSelected = theme === t.id;
            return (
              <div
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? 'border-primary shadow-md bg-[var(--surface-elevated)] ring-2 ring-primary/20'
                    : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-subtle)]'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center">
                    <Check size={14} />
                  </div>
                )}

                <div>
                  <div
                    className="h-20 rounded-lg mb-3 border border-[var(--border-subtle)] flex items-center justify-center"
                    style={{ background: t.previewBg }}
                  >
                    <Icon size={28} style={{ color: t.accentColor }} />
                  </div>
                  <h4 className="font-bold text-sm">{t.name}</h4>
                  <p className="text-xs text-muted mt-1 leading-relaxed">{t.desc}</p>
                </div>

                <button
                  type="button"
                  className={`btn btn-xs mt-3 w-full ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {isSelected ? 'Active Theme' : 'Apply Theme'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Store Operations Form */}
      <div className="card p-5 mb-5">
        <h3 className="section-title flex items-center gap-2 mb-3">
          <Globe size={18} className="text-primary" />
          <span>Store & Operational Profile</span>
        </h3>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label text-xs font-semibold">Store Brand Name</label>
              <input
                type="text"
                className="input"
                value={storeConfig.storeName}
                onChange={(e) => setStoreConfig({ ...storeConfig, storeName: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label text-xs font-semibold">Operations Support Email</label>
              <input
                type="email"
                className="input"
                value={storeConfig.supportEmail}
                onChange={(e) => setStoreConfig({ ...storeConfig, supportEmail: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-group">
              <label className="form-label text-xs font-semibold">Operating Currency</label>
              <input
                type="text"
                className="input"
                value={storeConfig.currency}
                disabled
              />
            </div>

            <div className="form-group">
              <label className="form-label text-xs font-semibold">Default Carbon Offset / Order</label>
              <input
                type="text"
                className="input"
                value={storeConfig.carbonOffsetPerOrder}
                onChange={(e) => setStoreConfig({ ...storeConfig, carbonOffsetPerOrder: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label text-xs font-semibold">Fulfillment SLA (Hours)</label>
              <input
                type="number"
                className="input"
                value={storeConfig.autoFulfillmentSlaHours}
                onChange={(e) => setStoreConfig({ ...storeConfig, autoFulfillmentSlaHours: e.target.value })}
              />
            </div>
          </div>

          <div className="border-t border-[var(--border-subtle)] pt-4 mt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5">
              <Bell size={13} className="text-primary" />
              <span>Customer Notification Channels</span>
            </h4>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={storeConfig.emailNotificationsEnabled}
                  onChange={(e) => setStoreConfig({ ...storeConfig, emailNotificationsEnabled: e.target.checked })}
                />
                <div>
                  <div className="text-sm font-medium">Automated Email Notifications</div>
                  <div className="text-xs text-muted">Dispatch confirmation and tracking links via SMTP</div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={storeConfig.smsNotificationsEnabled}
                  onChange={(e) => setStoreConfig({ ...storeConfig, smsNotificationsEnabled: e.target.checked })}
                />
                <div>
                  <div className="text-sm font-medium">Automated SMS Order Alerts</div>
                  <div className="text-xs text-muted">Send dispatch and delivery SMS updates to customer mobile numbers</div>
                </div>
              </label>
            </div>
          </div>

          <div className="pt-2">
            <button type="submit" className="btn btn-primary btn-sm flex items-center gap-1.5">
              <Save size={14} />
              <span>Save Configuration</span>
            </button>
          </div>
        </form>
      </div>

      {/* Backend Infrastructure Telemetry */}
      <div className="card p-5">
        <h3 className="section-title flex items-center gap-2 mb-3">
          <Server size={18} className="text-primary" />
          <span>System Architecture & Integration Status</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
            <div className="text-xs text-muted">Spring Boot Gateway</div>
            <div className="font-semibold text-sm mt-0.5">Port 8080</div>
            <span className="badge badge-success badge-xs mt-2">ACTIVE</span>
          </div>

          <div className="p-3 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
            <div className="text-xs text-muted">Django Core REST API</div>
            <div className="font-semibold text-sm mt-0.5">Port 8000</div>
            <span className="badge badge-success badge-xs mt-2">ACTIVE</span>
          </div>

          <div className="p-3 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
            <div className="text-xs text-muted">Order & Notification Bus</div>
            <div className="font-semibold text-sm mt-0.5">Kafka / In-Memory</div>
            <span className="badge badge-success badge-xs mt-2">CONNECTED</span>
          </div>

          <div className="p-3 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
            <div className="text-xs text-muted">Razorpay Gateway</div>
            <div className="font-semibold text-sm mt-0.5">UPI & Netbanking</div>
            <span className="badge badge-success badge-xs mt-2">PRODUCTION READY</span>
          </div>
        </div>
      </div>
    </div>
  );
};
