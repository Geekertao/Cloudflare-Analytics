import express from 'express';
import cron from 'node-cron';
import axios from 'axios';
import fs from 'fs/promises';
import yaml from 'js-yaml';
import path from 'path';

const OUT = './data/analytics.json';
const PORT = process.env.PORT || 4000;

// 配置加载函数
function loadConfig() {
  // 优先级1: 环境变量配置
  if (process.env.CF_CONFIG) {
    try {
      return JSON.parse(process.env.CF_CONFIG);
    } catch (e) {
      console.error('CF_CONFIG 环境变量格式错误:', e.message);
    }
  }

  // 优先级2: 解析环境变量中的tokens和zones
  const config = { accounts: [] };

  // 支持 CF_TOKENS 和 CF_ZONES 的简写格式
  if (process.env.CF_TOKENS && process.env.CF_ZONES) {
    const tokens = process.env.CF_TOKENS.split(',').map(t => t.trim());
    const zones = process.env.CF_ZONES.split(',').map(z => z.trim());
    const domains = process.env.CF_DOMAINS ? process.env.CF_DOMAINS.split(',').map(d => d.trim()) : zones;

    if (tokens.length > 0 && zones.length > 0) {
      config.accounts.push({
        name: process.env.CF_ACCOUNT_NAME || "默认账户",
        token: tokens[0],
        zones: zones.map((zone_id, index) => ({
          zone_id,
          domain: domains[index] || zone_id
        }))
      });
    }
  }

  // 支持 CF_TOKENS_1, CF_ZONES_1, CF_DOMAINS_1 的多账户格式
  let accountIndex = 1;
  while (process.env[`CF_TOKENS_${accountIndex}`]) {
    const tokens = process.env[`CF_TOKENS_${accountIndex}`].split(',').map(t => t.trim());
    const zones = process.env[`CF_ZONES_${accountIndex}`].split(',').map(z => z.trim());
    const domains = process.env[`CF_DOMAINS_${accountIndex}`] ?
      process.env[`CF_DOMAINS_${accountIndex}`].split(',').map(d => d.trim()) : zones;

    if (tokens.length > 0 && zones.length > 0) {
      config.accounts.push({
        name: process.env[`CF_ACCOUNT_NAME_${accountIndex}`] || `账户${accountIndex}`,
        token: tokens[0],
        zones: zones.map((zone_id, index) => ({
          zone_id,
          domain: domains[index] || zone_id
        }))
      });
    }
    accountIndex++;
  }

  // 优先级3: 配置文件
  if (config.accounts.length === 0) {
    try {
      const fileConfig = yaml.load(fs.readFileSync(new URL('./zones.yml', import.meta.url)));
      return fileConfig;
    } catch (e) {
      console.error('无法加载配置文件:', e.message);
    }
  }

  return config;
}

const CFG = loadConfig();

// 抓取数据 & 写文件
async function updateData() {
  try {
    console.log(`[数据更新] 开始更新数据... ${new Date().toLocaleString()}`);
    const payload = { accounts: [] };

    for (const [accIndex, acc] of CFG.accounts.entries()) {
      console.log(`  处理账户 ${accIndex + 1}/${CFG.accounts.length}: ${acc.name}`);
      const accData = { name: acc.name, zones: [] };

      for (const [zoneIndex, z] of acc.zones.entries()) {
        try {
          console.log(`    处理 Zone ${zoneIndex + 1}/${acc.zones.length}: ${z.domain}`);
          const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
          const until = new Date().toISOString().slice(0, 10);
          const query = `
            query($zone:String!,$since:Date!,$until:Date!){
              viewer{
                zones(filter:{zoneTag:$zone}){
                  httpRequests1dGroups(filter:{date_geq:$since,date_leq:$until}){
                    dimensions{date}
                    sum{requests bytes threats cachedRequests cachedBytes}
                  }
                }
              }
            }`;

          const res = await axios.post(
            'https://api.cloudflare.com/client/v4/graphql',
            { query, variables: { zone: z.zone_id, since, until } },
            {
              headers: { Authorization: `Bearer ${acc.token}` },
              timeout: 30000 // 30秒超时
            }
          );

          if (res.data.errors) {
            console.error(`    Zone ${z.domain} API错误:`, res.data.errors);
            accData.zones.push({
              domain: z.domain,
              raw: [],
              error: res.data.errors[0]?.message || 'API请求失败'
            });
          } else if (res.data.data?.viewer?.zones?.[0]?.httpRequests1dGroups) {
            const rawData = res.data.data.viewer.zones[0].httpRequests1dGroups;
            console.log(`    Zone ${z.domain} 数据获取成功: ${rawData.length} 条记录`);
            accData.zones.push({ domain: z.domain, raw: rawData });
          } else {
            console.warn(`    Zone ${z.domain} 返回数据为空`);
            accData.zones.push({ domain: z.domain, raw: [] });
          }
        } catch (error) {
          console.error(`    Zone ${z.domain} 处理失败:`, error.message);
          accData.zones.push({
            domain: z.domain,
            raw: [],
            error: error.message
          });
        }
      }
      payload.accounts.push(accData);
    }

    await fs.mkdir('./data', { recursive: true });
    await fs.writeFile(OUT, JSON.stringify(payload, null, 2));
    console.log(`[数据更新] 数据更新完成: ${payload.accounts.length} 个账户`);
  } catch (error) {
    console.error('[数据更新] 全局错误:', error.message);
  }
}
await updateData();
cron.schedule('* * * * *', updateData);

const app = express();

// 添加CORS支持
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// 静态文件服务
app.use('/data', express.static('./data', {
  setHeaders: (res, path) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
}));

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API状态接口
app.get('/api/status', (req, res) => {
  const dataExists = require('fs').existsSync('./data/analytics.json');
  res.json({
    status: 'running',
    dataExists,
    accounts: CFG.accounts.length,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`API listening on ${PORT}`);
  console.log(`配置加载成功: ${CFG.accounts.length} 个账户`);
  CFG.accounts.forEach((acc, index) => {
    console.log(`  账户 ${index + 1}: ${acc.name} (${acc.zones.length} 个 zones)`);
  });
});