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
  // 把后端数组转成 Recharts 需要的数据
  const data = raw.map((d) => ({
    date: d.dimensions.date,
    requests: d.sum.requests,
    bytes: d.sum.bytes,
    threats: d.sum.threats
  }));

  // 单位换算
  const fmtBytes = (b) => (b / 1024 / 1024 / 1024).toFixed(2) + ' GB';

  return (
    <div style={{ marginBottom: 40 }}>
      <h2>{domain}</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip
            formatter={(value, name) =>
              name === 'bytes' ? fmtBytes(value) : value.toLocaleString()
            }
          />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="requests"
            stroke="#8884d8"
            name="Requests"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="bytes"
            stroke="#82ca9d"
            name="Bytes"
          />
          <Line
            type="monotone"
            dataKey="threats"
            stroke="#ff7300"
            name="Threats"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CFLineChart;