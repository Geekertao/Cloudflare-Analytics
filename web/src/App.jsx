import React, { useEffect, useState } from 'react';
import axios from 'axios';
import LineChart from './components/LineChart';

function App() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 使用相对路径，通过nginx反向代理访问
    axios
      .get('/data/analytics.json')
      .then((res) => {
        console.log('API Response:', res.data); // 添加调试日志
        setAccounts(res.data.accounts || []);
        setError(null);
      })
      .catch((error) => {
        console.error('API Error:', error);
        setError('无法加载数据，请确保后端API正在运行并已生成数据文件');
        // 如果数据文件不存在，显示提示信息
        console.log('请确保后端API正在运行并已生成数据文件');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <h1>Cloudflare 多账户 / 多 Zone 折线图</h1>
        <p>正在加载数据...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <h1>Cloudflare 多账户 / 多 Zone 折线图</h1>
        <div style={{ color: 'red', marginTop: 20 }}>
          <p>错误: {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            style={{ marginTop: 10, padding: '10px 20px', cursor: 'pointer' }}
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  if (!accounts || accounts.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <h1>Cloudflare 多账户 / 多 Zone 折线图</h1>
        <p>暂无数据，请检查配置或稍后再试。</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 32 }}>
      <h1>Cloudflare 多账户 / 多 Zone 折线图</h1>
      {accounts.map((acc) => (
        <div key={acc.name} style={{ marginBottom: 40 }}>
          <h2 style={{ borderBottom: '2px solid #eee', paddingBottom: 10 }}>
            账户: {acc.name}
          </h2>
          {acc.zones && acc.zones.length > 0 ? (
            acc.zones.map((z) => (
              <LineChart
                key={z.domain}
                domain={z.domain}
                raw={z.raw || []}
              />
            ))
          ) : (
            <p>该账户暂无Zone数据</p>
          )}
        </div>
      ))}
    </div>
  );
}

export default App;