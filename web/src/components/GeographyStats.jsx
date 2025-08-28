import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useLanguage } from '../contexts/LanguageContext';

const GeographyStats = ({ data, formatNumber, formatBytes }) => {
  const { t } = useLanguage();
  
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

  // 饼状图配置
  const pieColors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7', '#ffecd2', '#fcb69f'];
  
  // 准备饼状图数据（前5个国家）
  const pieData = topCountries.slice(0, 5).map((country, index) => ({
    ...country,
    color: pieColors[index % pieColors.length]
  }));

  // 计算总请求数用于百分比计算
  const totalRequests = topCountries.reduce((sum, country) => sum + country.requests, 0);

  // 自定义Tooltip - 请求数柱状图
  const RequestsTooltip = ({ active, payload, label }) => {
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
          <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#333' }}>
            {data.country}
          </p>
          <p style={{ margin: '0', color: '#666' }}>
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
          backgroundColor: 'white',
          padding: '12px',
          border: '1px solid #e1e1e1',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#333' }}>
            {data.country}
          </p>
          <p style={{ margin: '0', color: '#666' }}>
            {t('bandwidth')}: {formatBytes(data.bytes)}
          </p>
        </div>
      );
    }
    return null;
  };

  // 自定义饼状图标签
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, country }) => {
    if (percent < 0.05) return null; // 小于5%不显示标签
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="12"
        fontWeight="600"
      >
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    );
  };

  // 自定义图例
  const renderLegend = ({ payload }) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
        {payload.map((entry, index) => {
          const data = pieData[index];
          const percentage = totalRequests > 0 ? ((data.requests / totalRequests) * 100).toFixed(1) : '0.0';
          return (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div 
                style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: entry.color,
                  borderRadius: '2px',
                  flexShrink: 0
                }}
              />
              <span style={{ 
                fontSize: '13px', 
                color: entry.color, // 文字颜色与饼状图颜色一致
                flex: 1,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontWeight: '500'
              }}>
                <span>{entry.payload.country}</span>
                <span style={{ fontWeight: '600' }}>
                  {percentage}% ({formatNumber(data.requests)})
                </span>
              </span>
            </div>
          );
        })}
      </div>
    );
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
      
      {/* 饼状图和图例 */}
      <div className="geography-pie-section">
        <h3>{t('requestDistribution')}</h3>
        <div className="pie-chart-container">
          <div className="pie-chart">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="requests"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name, props) => [
                    formatNumber(value), 
                    t('requests')
                  ]}
                  labelFormatter={(label) => props => props.payload[0]?.payload?.country}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="pie-legend">
            {renderLegend({ payload: pieData })}
          </div>
        </div>
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
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis 
                dataKey="country" 
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
                tick={{ fontSize: 12 }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<RequestsTooltip />} />
              <Bar 
                dataKey="requests" 
                fill="#667eea" 
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
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis 
                dataKey="country" 
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
                tick={{ fontSize: 12 }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<BandwidthTooltip />} />
              <Bar 
                dataKey="bytes" 
                fill="#764ba2" 
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