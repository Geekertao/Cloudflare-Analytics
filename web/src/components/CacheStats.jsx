import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useLanguage } from '../contexts/LanguageContext';

const CacheStats = ({ 
  totalRequests, 
  totalCachedRequests, 
  totalBytes, 
  totalCachedBytes,
  cacheRequestsRatio,
  cacheBytesRatio,
  formatNumber, 
  formatBytes 
}) => {
  const { t } = useLanguage();
  // 饼状图颜色配置
  const colors = ['#667eea', '#f093fb'];
  
  // 请求缓存数据
  const requestsData = [
    {
      name: t('cachedRequests'),
      value: totalCachedRequests,
      percentage: parseFloat(cacheRequestsRatio),
      formatted: formatNumber(totalCachedRequests)
    },
    {
      name: t('uncachedRequests'),
      value: totalRequests - totalCachedRequests,
      percentage: 100 - parseFloat(cacheRequestsRatio),
      formatted: formatNumber(totalRequests - totalCachedRequests)
    }
  ];

  // 带宽缓存数据
  const bytesData = [
    {
      name: t('cachedBandwidth'),
      value: totalCachedBytes,
      percentage: parseFloat(cacheBytesRatio),
      formatted: formatBytes(totalCachedBytes)
    },
    {
      name: t('uncachedBandwidth'),
      value: totalBytes - totalCachedBytes,
      percentage: 100 - parseFloat(cacheBytesRatio),
      formatted: formatBytes(totalBytes - totalCachedBytes)
    }
  ];

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          backgroundColor: 'white',
          padding: '12px',
          border: '1px solid #e1e1e1',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: '0 0 4px 0', fontWeight: '600', color: '#333' }}>
            {data.name}
          </p>
          <p style={{ margin: '0', color: '#666' }}>
            {data.formatted} ({data.percentage.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="cache-stats">
      {/* 请求缓存统计 */}
      <div className="cache-card">
        <h3 className="cache-title">{t('requestCacheStats')}</h3>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* 饼状图 */}
          <div style={{ flex: '0 0 160px' }}>
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={requestsData}
                  cx={80}
                  cy={80}
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {requestsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* 数据说明 */}
          <div style={{ flex: 1 }}>
            <div className="cache-item">
              <span className="cache-label">{t('cachedRequests')}：</span>
              <div>
                <span className="cache-value">{formatNumber(totalCachedRequests)}</span>
                <span className="cache-percentage">({cacheRequestsRatio}%)</span>
              </div>
            </div>
            
            <div className="cache-item">
              <span className="cache-label">{t('uncachedRequests')}：</span>
              <div>
                <span className="cache-value">{formatNumber(totalRequests - totalCachedRequests)}</span>
                <span className="cache-percentage">({(100 - parseFloat(cacheRequestsRatio)).toFixed(1)}%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 带宽缓存统计 */}
      <div className="cache-card">
        <h3 className="cache-title">{t('bandwidthCacheStats')}</h3>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* 饼状图 */}
          <div style={{ flex: '0 0 160px' }}>
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={bytesData}
                  cx={80}
                  cy={80}
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {bytesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* 数据说明 */}
          <div style={{ flex: 1 }}>
            <div className="cache-item">
              <span className="cache-label">{t('cachedBandwidth')}：</span>
              <div>
                <span className="cache-value">{formatBytes(totalCachedBytes)}</span>
                <span className="cache-percentage">({cacheBytesRatio}%)</span>
              </div>
            </div>
            
            <div className="cache-item">
              <span className="cache-label">{t('uncachedBandwidth')}：</span>
              <div>
                <span className="cache-value">{formatBytes(totalBytes - totalCachedBytes)}</span>
                <span className="cache-percentage">({(100 - parseFloat(cacheBytesRatio)).toFixed(1)}%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CacheStats;