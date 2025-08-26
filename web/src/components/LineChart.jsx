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

const CFLineChart = ({ domain, raw }) => {
  // 数据验证
  if (!raw || !Array.isArray(raw) || raw.length === 0) {
    return (
      <div style={{ marginBottom: 40, padding: 20, border: '1px solid #eee', borderRadius: 8 }}>
        <h3>{domain}</h3>
        <p style={{ color: '#999' }}>暂无数据或数据格式错误</p>
      </div>
    );
  }

  // 把API数据转成 Recharts 需要的数据格式
  const data = raw
    .filter(d => d && d.dimensions && d.sum) // 过滤无效数据
    .map((d) => {
      // 格式化日期
      const date = d.dimensions.date;
      const formattedDate = new Date(date).toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric'
      });
      
      return {
        date: formattedDate,
        originalDate: date,
        requests: parseInt(d.sum.requests) || 0,
        bytes: parseInt(d.sum.bytes) || 0,
        threats: parseInt(d.sum.threats) || 0,
        cachedRequests: parseInt(d.sum.cachedRequests) || 0,
        cachedBytes: parseInt(d.sum.cachedBytes) || 0
      };
    })
    .sort((a, b) => new Date(a.originalDate) - new Date(b.originalDate)); // 按日期排序

  if (data.length === 0) {
    return (
      <div style={{ marginBottom: 40, padding: 20, border: '1px solid #eee', borderRadius: 8 }}>
        <h3>{domain}</h3>
        <p style={{ color: '#999' }}>数据格式错误或无有效数据</p>
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
          padding: '10px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>{`日期: ${label}`}</p>
          {payload.map((entry, index) => {
            let value = entry.value;
            let unit = '';
            
            if (entry.dataKey === 'bytes' || entry.dataKey === 'cachedBytes') {
              value = formatBytes(entry.value);
            } else {
              value = formatNumber(entry.value);
            }
            
            return (
              <p key={index} style={{ margin: '4px 0', color: entry.color }}>
                {`${entry.name}: ${value}`}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ 
      marginBottom: 40, 
      padding: 20, 
      border: '1px solid #eee', 
      borderRadius: 8,
      backgroundColor: '#fafafa'
    }}>
      <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>{domain}</h3>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart 
          data={data} 
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis 
            yAxisId="left" 
            tick={{ fontSize: 12 }}
            tickFormatter={formatNumber}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            tick={{ fontSize: 12 }}
            tickFormatter={formatBytes}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="requests"
            stroke="#8884d8"
            strokeWidth={2}
            name="请求数"
            connectNulls={false}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="cachedRequests"
            stroke="#82ca9d"
            strokeWidth={2}
            strokeDasharray="5 5"
            name="缓存请求数"
            connectNulls={false}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="bytes"
            stroke="#ff7300"
            strokeWidth={2}
            name="流量"
            connectNulls={false}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="cachedBytes"
            stroke="#ffc658"
            strokeWidth={2}
            strokeDasharray="5 5"
            name="缓存流量"
            connectNulls={false}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="threats"
            stroke="#e74c3c"
            strokeWidth={2}
            name="威胁数"
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <div style={{ marginTop: 10, fontSize: 12, color: '#666' }}>
        <p>数据范围: {data.length > 0 ? `${data[0].originalDate} 至 ${data[data.length - 1].originalDate}` : 'N/A'}</p>
      </div>
    </div>
  );
};

export default CFLineChart;