import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useLanguage } from '../contexts/LanguageContext';

const CFLineChart = ({ domain, raw, rawHours, selectedPeriod }) => {
  const { t } = useLanguage();
  // 根据时间范围选择数据源：1天和3天使用小时级数据，7天和30天使用天级数据
  const useHourlyData = selectedPeriod === '1day' || selectedPeriod === '3days';
  const sourceData = useHourlyData ? rawHours : raw;
  
  console.log(`LineChart ${domain}: useHourlyData=${useHourlyData}, sourceData length:`, sourceData?.length);
  
  // 数据验证
  if (!sourceData || !Array.isArray(sourceData) || sourceData.length === 0) {
    console.warn(`LineChart ${domain}: 缺少${useHourlyData ? '小时级' : '天级'}数据`);
    return (
      <div style={{ 
        background: 'white',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        marginBottom: '20px'
      }}>
        <h3 style={{ 
          margin: '0 0 12px 0', 
          color: '#333',
          fontSize: '18px',
          fontWeight: '600'
        }}>
          {domain}
        </h3>
        <p style={{ 
          color: '#999',
          margin: 0,
          textAlign: 'center',
          padding: '40px 0'
        }}>
          暂无{useHourlyData ? '小时级' : '天级'}数据
          {useHourlyData && raw && raw.length > 0 && (
            <><br /><small>（使用天级数据代替）</small></>
          )}
        </p>
        {useHourlyData && raw && raw.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button 
              onClick={() => window.location.reload()} 
              style={{
                padding: '8px 16px',
                backgroundColor: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              使用天级数据显示
            </button>
          </div>
        )}
      </div>
    );
  }

  // 把API数据转成 Recharts 需要的数据格式
  const data = sourceData
    .filter(d => d && d.dimensions && d.sum) // 过滤无效数据
    .map((d) => {
      let date, formattedDate, originalDate;
      
      if (useHourlyData) {
        // 小时级数据使用datetime
        date = d.dimensions.datetime;
        const dateObj = new Date(date);
        formattedDate = `${dateObj.getMonth() + 1}/${dateObj.getDate()} ${dateObj.getHours()}:00`;
        originalDate = date;
      } else {
        // 天级数据使用date
        date = d.dimensions.date;
        const dateObj = new Date(date);
        formattedDate = dateObj.toLocaleDateString('zh-CN', {
          month: 'short',
          day: 'numeric'
        });
        originalDate = date;
      }
      
      return {
        date: formattedDate,
        originalDate: originalDate,
        requests: parseInt(d.sum.requests) || 0,
        bytes: parseInt(d.sum.bytes) || 0,
        threats: parseInt(d.sum.threats) || 0,
        cachedRequests: parseInt(d.sum.cachedRequests) || 0,
        cachedBytes: parseInt(d.sum.cachedBytes) || 0
      };
    })
    .sort((a, b) => new Date(a.originalDate) - new Date(b.originalDate)) // 按日期排序
    .slice(-Math.min(sourceData.length, 
      useHourlyData ? 
        (selectedPeriod === '1day' ? 24 : 72) : // 1天=24小时，3天=72小时
        (selectedPeriod === '7days' ? 7 : 30))); // 7天或30天

  if (data.length === 0) {
    return (
      <div style={{ 
        background: 'white',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        marginBottom: '20px'
      }}>
        <h3 style={{ 
          margin: '0 0 12px 0', 
          color: '#333',
          fontSize: '18px',
          fontWeight: '600'
        }}>
          {domain}
        </h3>
        <p style={{ 
          color: '#999',
          margin: 0,
          textAlign: 'center',
          padding: '40px 0'
        }}>
          {t('invalidData')}
        </p>
      </div>
    );
  }

  // 数据单位转换
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

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'white',
          padding: '12px',
          border: '1px solid #e1e1e1',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#333' }}>
            {useHourlyData ? `时间: ${label}` : `日期: ${label}`}
          </p>
          {payload.map((entry, index) => {
            let value = entry.value;
            
            if (entry.dataKey === 'bytes' || entry.dataKey === 'cachedBytes') {
              value = formatBytes(entry.value);
            } else {
              value = formatNumber(entry.value);
            }
            
            return (
              <p key={index} style={{ 
                margin: '4px 0', 
                color: entry.color,
                fontSize: '14px'
              }}>
                {`${entry.name}: ${value}`}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // 计算总计数据
  const totalData = data.reduce((acc, curr) => {
    acc.requests += curr.requests;
    acc.bytes += curr.bytes;
    acc.threats += curr.threats;
    acc.cachedRequests += curr.cachedRequests;
    return acc;
  }, { requests: 0, bytes: 0, threats: 0, cachedRequests: 0 });

  const cacheRatio = totalData.requests > 0 ? 
    ((totalData.cachedRequests / totalData.requests) * 100).toFixed(1) : 0;

  return (
    <div style={{ 
      background: 'white',
      padding: '24px',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
      marginBottom: '20px'
    }}>
      {/* 头部信息 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h3 style={{ 
            margin: '0 0 8px 0', 
            color: '#333',
            fontSize: '18px',
            fontWeight: '600'
          }}>
            {domain}
          </h3>
          <p style={{ 
            color: '#666',
            margin: 0,
            fontSize: '14px'
          }}>
            数据范围: {data.length > 0 ? 
              useHourlyData ? 
                `${new Date(data[0].originalDate).toLocaleString('zh-CN')} 至 ${new Date(data[data.length - 1].originalDate).toLocaleString('zh-CN')}` :
                `${data[0].originalDate} 至 ${data[data.length - 1].originalDate}` 
              : 'N/A'}
          </p>
        </div>
        
        {/* 快速统计 */}
        <div style={{ 
          display: 'flex', 
          gap: '20px',
          fontSize: '12px',
          color: '#666'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: '600', color: '#333' }}>
              {formatNumber(totalData.requests)}
            </div>
            <div>{t('totalRequestsShort')}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: '600', color: '#333' }}>
              {formatBytes(totalData.bytes)}
            </div>
            <div>{t('totalTrafficShort')}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: '600', color: '#667eea' }}>
              {cacheRatio}%
            </div>
            <div>{t('cacheRatio')}</div>
          </div>
        </div>
      </div>
      
      {/* 图表 */}
      <ResponsiveContainer width="100%" height={350}>
        <LineChart 
          data={data} 
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12, fill: '#666' }}
            axisLine={{ stroke: '#e1e1e1' }}
          />
          <YAxis 
            yAxisId="left" 
            tick={{ fontSize: 12, fill: '#666' }}
            tickFormatter={formatNumber}
            axisLine={{ stroke: '#e1e1e1' }}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            tick={{ fontSize: 12, fill: '#666' }}
            tickFormatter={formatBytes}
            axisLine={{ stroke: '#e1e1e1' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="requests"
            stroke="#667eea"
            strokeWidth={3}
            name={t('requests')}
            connectNulls={false}
            dot={{ fill: '#667eea', strokeWidth: 2, r: 4 }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="cachedRequests"
            stroke="#764ba2"
            strokeWidth={2}
            strokeDasharray="5 5"
            name={t('cachedRequestsChart')}
            connectNulls={false}
            dot={{ fill: '#764ba2', strokeWidth: 2, r: 3 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="bytes"
            stroke="#f093fb"
            strokeWidth={3}
            name={t('traffic')}
            connectNulls={false}
            dot={{ fill: '#f093fb', strokeWidth: 2, r: 4 }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="threats"
            stroke="#ff6b6b"
            strokeWidth={2}
            name={t('threats')}
            connectNulls={false}
            dot={{ fill: '#ff6b6b', strokeWidth: 2, r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CFLineChart;