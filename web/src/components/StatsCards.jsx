import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const StatsCards = ({ totalRequests, totalBytes, totalThreats, formatNumber, formatBytes }) => {
  const { t } = useLanguage();
  const stats = [
    {
      label: t('totalRequests'),
      value: formatNumber(totalRequests),
      icon: '📊'
    },
    {
      label: t('totalTraffic'),
      value: formatBytes(totalBytes),
      icon: '📈'
    },
    {
      label: t('totalThreats'),
      value: formatNumber(totalThreats),
      icon: '🛡️'
    },
    {
      label: '活跃Zone数',
      value: '多个', // 可以根据实际需要计算
      icon: '🌐'
    }
  ];

  return (
    <div className="stats-grid">
      {stats.map((stat, index) => (
        <div key={index} className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '24px', marginRight: '12px' }}>{stat.icon}</span>
            <div className="stat-label">{stat.label}</div>
          </div>
          <div className="stat-value">{stat.value}</div>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;