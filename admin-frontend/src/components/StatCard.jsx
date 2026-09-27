import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export const StatCard = ({
  title,
  value,
  change,
  trend = 'neutral',
  icon: IconComponent,
  subtitle,
  color = 'emerald',
  className = ''
}) => {
  return (
    <div className={`card stat-card border-left-${color} ${className}`}>
      <div className="stat-header">
        <span className="stat-title">{title}</span>
        {IconComponent && (
          <div className="stat-icon-wrapper" style={{ color: `var(--color-${color}-500, var(--primary-color))` }}>
            {React.isValidElement(IconComponent) ? (
              IconComponent
            ) : typeof IconComponent === 'function' ? (
              <IconComponent size={18} />
            ) : null}
          </div>
        )}
      </div>

      <div className="stat-value">{value}</div>

      <div className="stat-footer">
        {change && (
          <span className={`stat-trend trend-${trend}`}>
            {trend === 'up' && <TrendingUp size={13} />}
            {trend === 'down' && <TrendingDown size={13} />}
            {change}
          </span>
        )}
        {subtitle && <span className="stat-subtitle">{subtitle}</span>}
      </div>
    </div>
  );
};

export default StatCard;
