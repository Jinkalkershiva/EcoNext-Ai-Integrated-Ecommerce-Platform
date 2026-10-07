import React from 'react';
import { ShieldCheck, Truck, RotateCcw, CreditCard, Leaf } from 'lucide-react';
import './BenefitStrip.css';

export const BenefitStrip = () => {
  const benefits = [
    {
      icon: <Leaf size={20} />,
      title: '100% Eco-Certified',
      subtext: 'Verified sustainable goods',
    },
    {
      icon: <Truck size={20} />,
      title: 'Carbon-Neutral Delivery',
      subtext: 'Net-zero emissions shipping',
    },
    {
      icon: <RotateCcw size={20} />,
      title: '7-Day Easy Returns',
      subtext: 'Doorstep reverse pickups',
    },
    {
      icon: <CreditCard size={20} />,
      title: '100% Secure Payments',
      subtext: 'UPI, Cards & Cash on Delivery',
    },
    {
      icon: <ShieldCheck size={20} />,
      title: 'Direct Quality Inspection',
      subtext: 'Verified ethical suppliers',
    },
  ];

  return (
    <div className="benefit-strip-wrapper">
      <div className="container">
        <div className="benefit-strip-grid">
          {benefits.map((b, idx) => (
            <div key={idx} className="benefit-item">
              <div className="benefit-icon-box">{b.icon}</div>
              <div className="benefit-text-group">
                <span className="benefit-title">{b.title}</span>
                <span className="benefit-subtext">{b.subtext}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BenefitStrip;
