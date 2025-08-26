import React, { useMemo, useEffect, useState } from 'react';
import StatsCards from './StatsCards';
import CacheStats from './CacheStats';
import LineChart from './LineChart';

const Dashboard = ({ accounts, selectedPeriod, onPeriodChange }) => {
  const [showFloatingButtons, setShowFloatingButtons] = useState(false);

  // 监听滚动事件
  useEffect(() => {
    const handleScroll = () => {
      // 当滚动超过dashboard-header的高度时显示浮动按钮
      const dashboardHeader = document.querySelector('.dashboard-header');
      if (dashboardHeader) {
        const headerBottom = dashboardHeader.offsetTop + dashboardHeader.offsetHeight;
        setShowFloatingButtons(window.scrollY > headerBottom);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 计算汇总数据
  const aggregatedData = useMemo(() => {
    if (!accounts || accounts.length === 0) return null;

    let totalRequests = 0;
    let totalBytes = 0;
    let totalThreats = 0;
    let totalCachedRequests = 0;
    let totalCachedBytes = 0;
    let allZonesData = [];

    accounts.forEach(account => {
      account.zones?.forEach(zone => {
        if (zone.raw && Array.isArray(zone.raw)) {
          // 根据selectedPeriod过滤数据，只统计最新的N天
          const sortedData = zone.raw
            .filter(d => d && d.dimensions && d.sum)
            .sort((a, b) => new Date(a.dimensions.date) - new Date(b.dimensions.date));
          
          const periodDays = selectedPeriod === '1day' ? 1 : 
                           selectedPeriod === '3days' ? 3 : 
                           selectedPeriod === '7days' ? 7 : 30;
          
          const periodData = sortedData.slice(-Math.min(sortedData.length, periodDays));
          
          periodData.forEach(dayData => {
            if (dayData.sum) {
              totalRequests += parseInt(dayData.sum.requests) || 0;
              totalBytes += parseInt(dayData.sum.bytes) || 0;
              totalThreats += parseInt(dayData.sum.threats) || 0;
              totalCachedRequests += parseInt(dayData.sum.cachedRequests) || 0;
              totalCachedBytes += parseInt(dayData.sum.cachedBytes) || 0;
            }
          });
          
          allZonesData.push({
            ...zone,
            accountName: account.name
          });
        }
      });
    });

    return {
      totalRequests,
      totalBytes,
      totalThreats,
      totalCachedRequests,
      totalCachedBytes,
      allZonesData,
      cacheRequestsRatio: totalRequests > 0 ? ((totalCachedRequests / totalRequests) * 100).toFixed(1) : 0,
      cacheBytesRatio: totalBytes > 0 ? ((totalCachedBytes / totalBytes) * 100).toFixed(1) : 0
    };
  }, [accounts, selectedPeriod]); // 添加selectedPeriod作为依赖项

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('zh-CN').format(num);
  };

  if (!aggregatedData) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Cloudflare 分析数据</h1>
          <p className="dashboard-subtitle">暂无数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* 浮动按钮组 */}
      {showFloatingButtons && (
        <div className="floating-period-selector">
          <button
            className={`floating-period-button ${selectedPeriod === '1day' ? 'active' : ''}`}
            onClick={() => onPeriodChange('1day')}
          >
            单日数据
          </button>
          <button
            className={`floating-period-button ${selectedPeriod === '3days' ? 'active' : ''}`}
            onClick={() => onPeriodChange('3days')}
          >
            近3天
          </button>
          <button
            className={`floating-period-button ${selectedPeriod === '7days' ? 'active' : ''}`}
            onClick={() => onPeriodChange('7days')}
          >
            近7天
          </button>
          <button
            className={`floating-period-button ${selectedPeriod === '30days' ? 'active' : ''}`}
            onClick={() => onPeriodChange('30days')}
          >
            近30天
          </button>
        </div>
      )}

      {/* 标题区域 */}
      <div className="dashboard-header">
        <h1 className="dashboard-title">Cloudflare 分析数据</h1>
        <p className="dashboard-subtitle">Cloudflare流量分析仪表盘</p>
        
        {/* 时间段选择器 */}
        <div className="period-selector">
          <button
            className={`period-button ${selectedPeriod === '1day' ? 'active' : ''}`}
            onClick={() => onPeriodChange('1day')}
          >
            单日数据
          </button>
          <button
            className={`period-button ${selectedPeriod === '3days' ? 'active' : ''}`}
            onClick={() => onPeriodChange('3days')}
          >
            近3天
          </button>
          <button
            className={`period-button ${selectedPeriod === '7days' ? 'active' : ''}`}
            onClick={() => onPeriodChange('7days')}
          >
            近7天
          </button>
          <button
            className={`period-button ${selectedPeriod === '30days' ? 'active' : ''}`}
            onClick={() => onPeriodChange('30days')}
          >
            近30天
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <StatsCards 
        totalRequests={aggregatedData.totalRequests}
        totalBytes={aggregatedData.totalBytes}
        totalThreats={aggregatedData.totalThreats}
        formatNumber={formatNumber}
        formatBytes={formatBytes}
      />

      {/* 缓存统计 */}
      <CacheStats
        totalRequests={aggregatedData.totalRequests}
        totalCachedRequests={aggregatedData.totalCachedRequests}
        totalBytes={aggregatedData.totalBytes}
        totalCachedBytes={aggregatedData.totalCachedBytes}
        cacheRequestsRatio={aggregatedData.cacheRequestsRatio}
        cacheBytesRatio={aggregatedData.cacheBytesRatio}
        formatNumber={formatNumber}
        formatBytes={formatBytes}
      />

      {/* 图表区域 */}
      <div className="charts-section">
        <h2 className="section-title">Web 流量趋势</h2>
        {accounts.map((account) => (
          <div key={account.name} className="account-section">
            <div className="account-header">
              <h3 className="account-name">账户: {account.name}</h3>
            </div>
            <div className="zones-grid">
              {account.zones && account.zones.length > 0 ? (
                account.zones.map((zone) => (
                  <LineChart
                    key={zone.domain}
                    domain={zone.domain}
                    raw={zone.raw || []}
                    selectedPeriod={selectedPeriod}
                  />
                ))
              ) : (
                <div style={{ 
                  background: 'white', 
                  padding: '20px', 
                  borderRadius: '12px',
                  textAlign: 'center',
                  color: '#666'
                }}>
                  该账户暂无Zone数据
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;