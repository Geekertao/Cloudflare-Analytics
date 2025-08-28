import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const StatsCards = ({ totalRequests, totalBytes, totalThreats, formatNumber, formatBytes, accounts }) => {
  const { t } = useLanguage();
  
  // 计算活跃Zone数
  const calculateActiveZones = () => {
    if (!accounts || !Array.isArray(accounts)) return 0;
    
    let activeZoneCount = 0;
    accounts.forEach(account => {
      if (account.zones && Array.isArray(account.zones)) {
        account.zones.forEach(zone => {
          // 检查Zone是否有数据（有raw或rawHours数据即为活跃）
          const hasData = (zone.raw && zone.raw.length > 0) || 
                         (zone.rawHours && zone.rawHours.length > 0);
          if (hasData) {
            activeZoneCount++;
          }
        });
      }
    });
    
    return activeZoneCount;
  };
  
  const activeZones = calculateActiveZones();
  
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
      label: t('activeZones'),
      value: activeZones.toString(),
      icon: '🌐'
    }
  ];

  return (
    <div className="stats-grid">
      {stats.map((stat, index) => (
        <div key={index} className="stat-card">
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            marginBottom: '12px' 
          }}>
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