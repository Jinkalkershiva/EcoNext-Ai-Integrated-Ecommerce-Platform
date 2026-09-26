import React from 'react';
import { motion } from 'framer-motion';
import Button from './Button';
import './Hero.css';

export const Hero = ({
  headline = 'Shop Smarter. Live Greener.',
  subtext = 'Discover verified eco-friendly goods powered by machine learning price predictions, visual snap-search, and personalized sustainability curation.',
  tag = 'AI-Driven Sustainable E-Commerce',
  tagIcon = null,
  primaryCta = null,
  secondaryCta = null,
  stats = [],
  visual = null,
  children,
  className = '',
}) => {
  return (
    <section className={`hero-container ${className}`}>
      <div className="hero-grid">
        {/* Left Column: Copy & Actions */}
        <motion.div
          className="hero-content"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          {tag && (
            <div className="hero-pill-tag">
              {tagIcon}
              <span>{tag}</span>
            </div>
          )}

          <h1 className="hero-headline">{headline}</h1>

          {subtext && <p className="hero-subtext">{subtext}</p>}

          {(primaryCta || secondaryCta) && (
            <div className="hero-cta-group">
              {primaryCta && (
                <Button
                  variant={primaryCta.variant || 'primary'}
                  size={primaryCta.size || 'lg'}
                  onClick={primaryCta.onClick}
                  icon={primaryCta.icon}
                  iconPosition={primaryCta.iconPosition || 'right'}
                >
                  {primaryCta.text}
                </Button>
              )}
              {secondaryCta && (
                <Button
                  variant={secondaryCta.variant || 'secondary'}
                  size={secondaryCta.size || 'lg'}
                  onClick={secondaryCta.onClick}
                  icon={secondaryCta.icon}
                  iconPosition={secondaryCta.iconPosition || 'left'}
                >
                  {secondaryCta.text}
                </Button>
              )}
            </div>
          )}

          {stats && stats.length > 0 && (
            <div className="hero-stats-row">
              {stats.map((item, idx) => (
                <div key={idx} className="hero-stat-item">
                  <span className="hero-stat-value">{item.value}</span>
                  <span className="hero-stat-label">{item.label}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Right Column: Animated Visual Panel */}
        <motion.div
          className="hero-visual-wrapper"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
        >
          <div className="hero-ambient-ring" aria-hidden="true" />
          <div className="hero-visual-panel">{visual || children}</div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
