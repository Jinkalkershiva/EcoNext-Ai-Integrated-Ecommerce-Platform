import React from 'react';
import {
  Leaf,
  ShieldCheck,
  Sparkles,
  Truck,
  RotateCcw,
  Lock,
  ArrowUpRight,
  Headphones,
  CheckCircle2,
  Package
} from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import './Footer.css';

export const Footer = () => {
  const { navigateTo } = useNavigation();

  return (
    <footer className="marketplace-footer-container">
      {/* Top Value Assurance Strip */}
      <div className="footer-assurance-strip">
        <div className="container">
          <div className="footer-assurance-grid">
            <div className="assurance-item">
              <div className="assurance-icon-box">
                <Truck size={20} />
              </div>
              <div className="assurance-text">
                <div className="assurance-heading">Carbon-Neutral Free Delivery</div>
                <div className="assurance-sub">On all verified eco-friendly orders</div>
              </div>
            </div>

            <div className="assurance-item">
              <div className="assurance-icon-box">
                <RotateCcw size={20} />
              </div>
              <div className="assurance-text">
                <div className="assurance-heading">7-Day Easy Returns</div>
                <div className="assurance-sub">Hassle-free doorstep QC & instant refunds</div>
              </div>
            </div>

            <div className="assurance-item">
              <div className="assurance-icon-box">
                <ShieldCheck size={20} />
              </div>
              <div className="assurance-text">
                <div className="assurance-heading">100% Verified Sourcing</div>
                <div className="assurance-sub">Ethical certifications & carbon audited</div>
              </div>
            </div>

            <div className="assurance-item">
              <div className="assurance-icon-box">
                <Lock size={20} />
              </div>
              <div className="assurance-text">
                <div className="assurance-heading">Safe & Secure Payments</div>
                <div className="assurance-sub">Razorpay 256-bit SSL & COD with OTP</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Multi-Column Links Section */}
      <div className="container">
        <div className="footer-main-grid">
          {/* Brand Info */}
          <div className="footer-brand-col">
            <div className="footer-brand-logo" onClick={() => navigateTo('home')}>
              <div className="brand-leaf-icon">
                <Leaf size={22} />
              </div>
              <span>EcoNext</span>
            </div>
            <p className="footer-brand-tagline">
              India's premier AI-integrated sustainable marketplace. We empower conscious living through verified green goods, transparent carbon metrics, and dynamic price intelligence.
            </p>
            <div className="footer-security-pill">
              <CheckCircle2 size={15} />
              <span>Certified Sustainable Marketplace</span>
            </div>
          </div>

          {/* Shop Categories */}
          <div>
            <h4 className="footer-section-title">Shop by Category</h4>
            <ul className="footer-links-list">
              <li>
                <span className="footer-link-action" onClick={() => navigateTo('women')}>
                  Women's Sustainable Fashion
                </span>
              </li>
              <li>
                <span className="footer-link-action" onClick={() => navigateTo('men')}>
                  Men's Organic Apparel
                </span>
              </li>
              <li>
                <span className="footer-link-action" onClick={() => navigateTo('kids')}>
                  Kids & Baby Eco Essentials
                </span>
              </li>
              <li>
                <span className="footer-link-action" onClick={() => navigateTo('teens')}>
                  Teens & Gen-Z Sustainable
                </span>
              </li>
              <li>
                <span className="footer-link-action" onClick={() => navigateTo('products')}>
                  All Catalog Products
                </span>
              </li>
            </ul>
          </div>

          {/* Customer Care & Orders */}
          <div>
            <h4 className="footer-section-title">Customer Care</h4>
            <ul className="footer-links-list">
              <li>
                <span className="footer-link-action" onClick={() => navigateTo('order-tracking')}>
                  <Package size={13} /> Track Your Order
                </span>
              </li>
              <li>
                <span className="footer-link-action" onClick={() => navigateTo('orders')}>
                  Order History & Invoices
                </span>
              </li>
              <li>
                <span className="footer-link-action" onClick={() => navigateTo('orders')}>
                  Cancellations & Returns
                </span>
              </li>
              <li>
                <span className="footer-link-action" onClick={() => navigateTo('preferences')}>
                  Eco Preferences & Size
                </span>
              </li>
              <li>
                <span className="footer-link-action" style={{ cursor: 'default' }}>
                  <Headphones size={13} /> 24/7 Support: support@econext.in
                </span>
              </li>
            </ul>
          </div>

          {/* AI Features & Technology */}
          <div>
            <h4 className="footer-section-title">AI & Intelligence</h4>
            <ul className="footer-links-list">
              <li>
                <span className="footer-link-action" onClick={() => navigateTo('trending')}>
                  <Sparkles size={13} style={{ color: 'var(--color-primary)' }} /> AI Price Trend Predictor
                </span>
              </li>
              <li>
                <span className="footer-link-action" onClick={() => navigateTo('visual-search')}>
                  <Sparkles size={13} style={{ color: 'var(--color-primary)' }} /> Visual Snap & Shop AI
                </span>
              </li>
              <li>
                <span className="footer-link-action" onClick={() => navigateTo('products')}>
                  Semantic Intent Search
                </span>
              </li>
              <li>
                <a
                  href="https://github.com/Jinkalkershiva/EcoNext-Ai-Integrated-Ecommerce-Platform"
                  target="_blank"
                  rel="noreferrer"
                  className="footer-link-action"
                  style={{ color: 'var(--color-primary)', fontWeight: 700 }}
                >
                  GitHub Architecture <ArrowUpRight size={14} />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Legal, Payment & Copyright Row */}
        <div className="footer-bottom-bar">
          <div className="footer-copyright-text">
            &copy; {new Date().getFullYear()} EcoNext Marketplace Private Limited. All Rights Reserved.
          </div>

          <div className="footer-payment-methods">
            <span className="payment-badge-pill">UPI</span>
            <span className="payment-badge-pill">RuPay</span>
            <span className="payment-badge-pill">Visa</span>
            <span className="payment-badge-pill">Mastercard</span>
            <span className="payment-badge-pill">NetBanking</span>
            <span className="payment-badge-pill">Cash on Delivery</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
