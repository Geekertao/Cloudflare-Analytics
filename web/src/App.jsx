import React, { useEffect, useState } from 'react';
import axios from 'axios';
import LineChart from './components/LineChart';

function App() {
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    axios
      .get(`${process.env.REACT_APP_API || ''}/api/data/analytics.json`)
      .then((res) => setAccounts(res.data.accounts || []))
      .catch(console.error);
  }, []);

  return (
    <div style={{ padding: 32 }}>
      <h1>Cloudflare 多账户 / 多 Zone 折线图</h1>
      {accounts.map((acc) =>
        acc.zones.map((z) => (
          <LineChart
            key={z.domain}
            domain={z.domain}
            raw={z.raw}
          />
        ))
      )}
    </div>
  );
}

export default App;