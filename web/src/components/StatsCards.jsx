import React from 'react';

const StatsCards = ({ totalRequests, totalBytes, totalThreats, formatNumber, formatBytes }) => {
  const stats = [
    {
      label: '总请求数(近30天)',
      value: formatNumber(totalRequests),
      icon: '📊'
    },
    {
      label: '总带宽使用(近30天)',
      value: formatBytes(totalBytes),
      icon: '📈'
    },
    {
      label: '威胁请求数(近30天)',
      value: formatNumber(totalThreats),
      icon: '🛡️'
    },
    {
      label: '活跃Zone数(近30天)',
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