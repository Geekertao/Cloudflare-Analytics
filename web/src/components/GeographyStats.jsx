import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

const GeographyStats = ({ data, formatNumber, formatBytes }) => {
  const { t } = useLanguage();
  const { isDarkMode } = useTheme();
  
  // 主题相关的颜色配置
  const themeColors = {
    background: isDarkMode ? '#2d2d2d' : '#ffffff',
    text: isDarkMode ? '#ffffff' : '#333333',
    textSecondary: isDarkMode ? '#b0b0b0' : '#666666',
    border: isDarkMode ? '#404040' : '#e1e1e1',
    grid: isDarkMode ? '#404040' : undefined, // 深色模式使用更明显的网格
    // 图表颜色保持一致
    chartColors: {
      requests: '#667eea',
      bandwidth: '#764ba2'
    }
  };
  
  // 聚合所有Zone的地理位置数据
  const aggregateGeographyData = () => {
    const countryStats = {};
    
    if (!data || !Array.isArray(data)) {
      console.warn('GeographyStats: data is not an array or is null');
      return [];
    }
    
    console.log('GeographyStats: Processing data:', data);
    
    data.forEach(account => {
      console.log(`Processing account: ${account.name}`);
      if (account.zones && Array.isArray(account.zones)) {
        account.zones.forEach(zone => {
          console.log(`Processing zone: ${zone.domain}, geography:`, zone.geography);
          if (zone.geography && Array.isArray(zone.geography)) {
            zone.geography.forEach(geo => {
              const countryName = geo.dimensions?.clientCountryName;
              console.log(`Processing country: ${countryName}, requests: ${geo.sum?.requests || geo.count}, bytes: ${geo.sum?.bytes}`);
              if (countryName && countryName !== 'Unknown' && countryName !== '') {
                if (!countryStats[countryName]) {
                  countryStats[countryName] = {
                    country: countryName,
                    requests: 0,
                    bytes: 0,
                    threats: 0
                  };
                }
                // 兼容新旧数据格式
                countryStats[countryName].requests += geo.sum?.requests || geo.count || 0;
                countryStats[countryName].bytes += geo.sum?.bytes || 0;
                countryStats[countryName].threats += geo.sum?.threats || 0;
              }
            });
          } else {
            console.warn(`Zone ${zone.domain} has no geography data`);
          }
        });
      } else {
        console.warn(`Account ${account.name} has no zones or zones is not an array`);
      }
    });
    
    const result = Object.values(countryStats)
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 5); // 保持前5个国家
    
    console.log('GeographyStats: Final aggregated data:', result);
    return result;
  };

  const topCountries = aggregateGeographyData();

  // 计算总请求数用于百分比计算
  const totalRequests = topCountries.reduce((sum, country) => sum + country.requests, 0);

  // 自定义Tooltip - 请求数柱状图
  const RequestsTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          backgroundColor: themeColors.background,
          padding: '12px',
          border: `1px solid ${themeColors.border}`,
          borderRadius: '8px',
          boxShadow: isDarkMode ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: themeColors.text }}>
            {data.country}
          </p>
          <p style={{ margin: '0', color: themeColors.textSecondary }}>
            {t('requests')}: {formatNumber(data.requests)}
          </p>
        </div>
      );
    }
    return null;
  };

  // 自定义Tooltip - 带宽柱状图
  const BandwidthTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          backgroundColor: themeColors.background,
          padding: '12px',
          border: `1px solid ${themeColors.border}`,
          borderRadius: '8px',
          boxShadow: isDarkMode ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: themeColors.text }}>
            {data.country}
          </p>
          <p style={{ margin: '0', color: themeColors.textSecondary }}>
            {t('bandwidth')}: {formatBytes(data.bytes)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (!topCountries || topCountries.length === 0) {
    return (
      <div className="geography-stats">
        <div className="section-header">
          <h2>{t('geographyStats')}</h2>
          <p className="section-subtitle">{t('topCountriesRegions')}</p>
        </div>
        <div className="no-data">
          <p>{t('noGeographyData')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="geography-stats">
      <div className="section-header">
        <h2>{t('geographyStats')}</h2>
        <p className="section-subtitle">{t('topCountriesRegions')}</p>
      </div>
      {/* 双柱状图容器 */}
      <div className="charts-container">
        {/* 请求数柱状图 */}
        <div className="chart-item">
          <h3>{t('requestsByCountry')}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={topCountries}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 60
              }}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                opacity={0.3}
                stroke={themeColors.grid}
              />
              <XAxis 
                dataKey="country" 
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
                tick={{ fontSize: 12, fill: themeColors.textSecondary }}
              />
              <YAxis tick={{ fontSize: 12, fill: themeColors.textSecondary }} />
              <Tooltip content={<RequestsTooltip />} />
              <Bar 
                dataKey="requests" 
                fill={themeColors.chartColors.requests}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 带宽柱状图 */}
        <div className="chart-item">
          <h3>{t('bandwidthByCountry')}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={topCountries}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 60
              }}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                opacity={0.3}
                stroke={themeColors.grid}
              />
              <XAxis 
                dataKey="country" 
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
                tick={{ fontSize: 12, fill: themeColors.textSecondary }}
              />
              <YAxis tick={{ fontSize: 12, fill: themeColors.textSecondary }} />
              <Tooltip content={<BandwidthTooltip />} />
              <Bar 
                dataKey="bytes" 
                fill={themeColors.chartColors.bandwidth}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 统计列表 */}
      <div className="geography-list">
        <h3>{t('detailedStats')}</h3>
        <div className="stats-table">
          <div className="table-header">
            <div className="col-rank">#</div>
            <div className="col-country">{t('countryRegion')}</div>
            <div className="col-requests">{t('requests')}</div>
            <div className="col-bandwidth">{t('bandwidth')}</div>
          </div>
          {topCountries.map((country, index) => {
            const percentage = totalRequests > 0 ? ((country.requests / totalRequests) * 100).toFixed(1) : '0.0';
            return (
              <div key={country.country} className="table-row">
                <div className="col-rank">
                  <span className="rank-badge">{index + 1}</span>
                </div>
                <div className="col-country">
                  <span className="country-flag">🌍</span>
                  <span className="country-name">{country.country}</span>
                  <span className="country-percentage">({percentage}%)</span>
                </div>
                <div className="col-requests">
                  {formatNumber(country.requests)}
                </div>
                <div className="col-bandwidth">
                  {formatBytes(country.bytes)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GeographyStats;