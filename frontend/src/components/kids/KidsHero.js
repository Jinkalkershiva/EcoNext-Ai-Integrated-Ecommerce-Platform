import React from 'react';
import { Camera, ArrowRight, Sparkles, Play } from 'lucide-react';
import './KidsHero.css';

export const KidsHero = ({
  eyebrow = '✨ AI-Powered Sustainable Shopping',
  title = 'Shop smarter.',
  highlight = 'Live greener.',
  subtitle = 'Verified eco-friendly goods, real-time price forecasts, and visual search — all in one colorful, carbon-conscious marketplace for kids.',
  onExplore,
  onVisualSearch,
}) => {
  return (
    <section className="kids-hero-section">
      <div className="kids-hero-bg" />

      {/* Playful Floating Decorative Blobs */}
      <div
        className="kids-blob"
        style={{
          width: '180px',
          height: '180px',
          background: 'var(--color-secondary)',
          top: '8%',
          left: '2%',
        }}
      />
      <div
        className="kids-blob"
        style={{
          width: '130px',
          height: '130px',
          background: 'var(--color-quaternary, #FFC94A)',
          bottom: '6%',
          left: '38%',
          animationDelay: '2s',
        }}
      />

      <div className="kids-hero-grid">
        {/* Left Column */}
        <div>
          <div className="kids-eyebrow">
            <Sparkles size={14} />
            <span>{eyebrow}</span>
          </div>

          <h1 className="kids-hero-title">
            {title}
            <br />
            <em>{highlight}</em>
          </h1>

          <p className="kids-hero-subtext">{subtitle}</p>

          <div className="kids-btn-row">
            <button
              type="button"
              className="kids-btn primary"
              onClick={onExplore}
            >
              Explore Collection
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              className="kids-btn ghost"
              onClick={onVisualSearch}
            >
              <Camera size={16} />
              Snap & Shop
            </button>
          </div>
        </div>

        {/* Right Column: Animated Visual Panel */}
        <div className="kids-video-panel">
          <div
            className="kids-ring"
            style={{ width: '260px', height: '260px', top: '-40px', left: '-40px' }}
          />
          <button
            type="button"
            className="kids-playbtn"
            onClick={onExplore}
            aria-label="Play Kids Showcase"
          >
            <Play size={24} fill="currentColor" style={{ marginLeft: '4px' }} />
          </button>
          <div className="kids-tag-float" style={{ top: '16px', right: '16px' }}>
            🌱 100% Verified
          </div>
          <div
            className="kids-tag-float"
            style={{ bottom: '16px', left: '16px', animationDelay: '1.5s' }}
          >
            📦 Carbon-Neutral
          </div>
        </div>
      </div>
    </section>
  );
};

export default KidsHero;
