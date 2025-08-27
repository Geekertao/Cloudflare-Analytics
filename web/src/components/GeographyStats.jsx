import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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
              console.log(`Processing country: ${countryName}, count: ${geo.count}`);
              if (countryName && countryName !== 'Unknown' && countryName !== '') {
                if (!countryStats[countryName]) {
                  countryStats[countryName] = {
                    country: countryName,
                    requests: 0,
                    bytes: 0,
                    threats: 0
                  };
                }
                // 由于httpRequestsAdaptiveGroups只返回count字段，我们使用count作为请求数
                countryStats[countryName].requests += geo.count || 0;
                // bytes和threats暂无数据，设为0
                countryStats[countryName].bytes += 0;
                countryStats[countryName].threats += 0;
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
      .slice(0, 5);
    
    console.log('GeographyStats: Final aggregated data:', result);
    return result;
  };

  const topCountries = aggregateGeographyData();

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
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
      
      {/* 柱状图 */}
      <div className="geography-chart">
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
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="requests" 
              fill="#667eea" 
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 统计列表 */}
      <div className="geography-list">
        <h3>{t('detailedStats')}</h3>
        <div className="stats-table">
          <div className="table-header">
            <div className="col-rank">#</div>
            <div className="col-country">{t('countryRegion')}</div>
            <div className="col-requests">{t('requests')}</div>
          </div>
          {topCountries.map((country, index) => (
            <div key={country.country} className="table-row">
              <div className="col-rank">
                <span className="rank-badge">{index + 1}</span>
              </div>
              <div className="col-country">
                <span className="country-flag">🌍</span>
                <span className="country-name">{country.country}</span>
              </div>
              <div className="col-requests">
                {formatNumber(country.requests)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GeographyStats;