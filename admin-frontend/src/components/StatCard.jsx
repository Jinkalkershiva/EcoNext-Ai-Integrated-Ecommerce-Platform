import React from 'react';

export const StatCard = ({ title, value, change, trend = 'neutral', icon, subtitle, color = 'emerald' }) => {
  return (
    <div className={`card stat-card border-left-${color}`}>
      <div className="stat-header">
        <span className="stat-title">{title}</span>
        {icon && <div className="stat-icon-wrapper">{icon}</div>}
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-footer">
        {change && (
          <span className={`stat-trend trend-${trend}`}>
            {trend === 'up' && '↑ '}
            {trend === 'down' && '↓ '}
            {change}
          </span>
        )}
        {subtitle && <span className="stat-subtitle">{subtitle}</span>}
      </div>
    </div>
  );
};
