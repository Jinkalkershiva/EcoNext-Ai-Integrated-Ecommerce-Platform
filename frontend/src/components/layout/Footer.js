import React from 'react';
import { Leaf, ShieldCheck, Sparkles, Cpu, Globe, ArrowUpRight } from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import './Footer.css';

export const Footer = () => {
  const { navigateTo } = useNavigation();

  return (
    <footer className="footer-container">
      <div className="container">
        <div className="footer-grid">
          {/* Brand Column */}
          <div className="footer-brand-column">
            <div className="footer-brand-title">
              <div className="navbar-brand-icon">
                <Leaf size={20} />
              </div>
              <span>EcoNext</span>
            </div>
            <p className="footer-brand-desc">
              AI-driven sustainable marketplace connecting conscious consumers with verified eco-friendly goods, real-time price predictions, and visual product discovery.
            </p>
            <div className="footer-eco-badge">
              <ShieldCheck size={16} />
              <span>100% Verified Sustainable Catalog</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="footer-column-title">Explore</h4>
            <ul className="footer-links-list">
              <li>
                <span className="footer-link-item" onClick={() => navigateTo('home')}>
                  Home
                </span>
              </li>
              <li>
                <span className="footer-link-item" onClick={() => navigateTo('products')}>
                  All Eco Products
                </span>
              </li>
              <li>
                <span className="footer-link-item" onClick={() => navigateTo('trending')}>
                  Trending Items
                </span>
              </li>
              <li>
                <span className="footer-link-item" onClick={() => navigateTo('visual-search')}>
                  <Sparkles size={13} style={{ color: 'var(--color-accent)' }} /> Snap & Shop AI
                </span>
              </li>
              <li>
                <span className="footer-link-item" onClick={() => navigateTo('preferences')}>
                  Personalization Center
                </span>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="footer-column-title">Segments</h4>
            <ul className="footer-links-list">
              {['Kids', 'Teens', 'Men', 'Women', 'Unisex'].map((seg) => (
                <li key={seg}>
                  <span
                    className="footer-link-item"
                    onClick={() => navigateTo(seg.toLowerCase())}
                  >
                    EcoNext {seg}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* AI & Sustainability */}
          <div>
            <h4 className="footer-column-title">AI & Mission</h4>
            <ul className="footer-links-list">
              <li>
                <span className="footer-link-item" style={{ cursor: 'default' }}>
                  <Cpu size={14} /> Linear Regression Price Forecasting
                </span>
              </li>
              <li>
                <span className="footer-link-item" style={{ cursor: 'default' }}>
                  <Sparkles size={14} /> Semantic Intent Search
                </span>
              </li>
              <li>
                <span className="footer-link-item" style={{ cursor: 'default' }}>
                  <Globe size={14} /> Carbon Offset Deliveries
                </span>
              </li>
              <li>
                <a
                  href="https://github.com/Jinkalkershiva/EcoNext-Ai-Integrated-Ecommerce-Platform"
                  target="_blank"
                  rel="noreferrer"
                  className="footer-link-item"
                  style={{ color: 'var(--color-primary)', fontWeight: 600 }}
                >
                  GitHub Repository <ArrowUpRight size={14} />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom">
          <div>
            &copy; {new Date().getFullYear()} EcoNext Technologies. Built for sustainable living.
          </div>
          <div className="footer-badges-row">
            <span>Clean Architecture</span>
            <span>•</span>
            <span>React 19</span>
            <span>•</span>
            <span>Microservices Backend</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
