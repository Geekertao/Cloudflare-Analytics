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

// 验证API Token的功能
async function validateToken(token, zoneName) {
  try {
    console.log(`[Token验证] 验证Token对Zone ${zoneName}的访问权限...`);

    // 1. 首先测试基本的API访问
    const testQuery = `
      query {
        viewer {
          zones(limit: 1) {
            zoneTag
            name
          }
        }
      }`;

    const response = await axios.post(
      'https://api.cloudflare.com/client/v4/graphql',
      { query: testQuery },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    if (response.data.errors) {
      console.error(`[Token验证] API访问失败:`, response.data.errors);
      return {
        valid: false,
        error: 'API访问被拒绝',
        details: response.data.errors
      };
    }

    if (!response.data.data?.viewer?.zones) {
      console.error(`[Token验证] Token无法访问任何Zone`);
      return {
        valid: false,
        error: 'Token无Zone访问权限'
      };
    }

    const accessibleZones = response.data.data.viewer.zones;
    console.log(`[Token验证] Token可访问 ${accessibleZones.length} 个Zone`);

    return {
      valid: true,
      accessibleZones: accessibleZones.length,
      zones: accessibleZones
    };

  } catch (error) {
    console.error(`[Token验证] 验证过程出错:`, error.message);
    if (error.response?.status === 401) {
      return {
        valid: false,
        error: 'Token无效或已过期',
        httpStatus: 401
      };
    }
    if (error.response?.status === 403) {
      return {
        valid: false,
        error: 'Token权限不足',
        httpStatus: 403
      };
    }
    return {
      valid: false,
      error: error.message,
      httpStatus: error.response?.status
    };
  }
}

// 获取Zone信息的函数
async function getZoneInfo(token, zoneId) {
  try {
    const query = `
      query($zoneId: String!) {
        viewer {
          zones(filter: {zoneTag: $zoneId}) {
            zoneTag
            name
            status
          }
        }
      }`;

    const response = await axios.post(
      'https://api.cloudflare.com/client/v4/graphql',
      { query, variables: { zoneId } },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    if (response.data.errors) {
      console.error(`[Zone信息] Zone ${zoneId} 查询失败:`, response.data.errors);
      return null;
    }

    const zones = response.data.data?.viewer?.zones;
    if (!zones || zones.length === 0) {
      console.error(`[Zone信息] Zone ${zoneId} 不存在或无访问权限`);
      return null;
    }

    return zones[0];
  } catch (error) {
    console.error(`[Zone信息] 查询Zone ${zoneId} 出错:`, error.message);
    return null;
  }
}

const CFG = loadConfig();

// 验证所有配置的Token
async function validateAllTokens() {
  console.log(`[Token验证] 开始验证 ${CFG.accounts.length} 个账户的Token...`);

  for (const [index, account] of CFG.accounts.entries()) {
    console.log(`\n[Token验证] 验证账户 ${index + 1}: ${account.name}`);
    const validation = await validateToken(account.token, account.name);

    if (!validation.valid) {
      console.error(`⚠️ [错误] 账户 ${account.name} Token验证失败:`, validation.error);
      if (validation.httpStatus === 401) {
        console.error(`ℹ️ 请检查:`);
        console.error(`   1. Token是否正确（不包含多余空格或特殊字符）`);
        console.error(`   2. Token是否已过期`);
        console.error(`   3. Token是否具有 'Analytics:Read' 权限`);
        console.error(`   4. Token是否具有正确的Zone访问权限`);
      }
    } else {
      console.log(`✓ 账户 ${account.name} Token验证成功，可访问 ${validation.accessibleZones} 个Zone`);

      // 验证具体的Zone访问权限
      for (const zone of account.zones) {
        const zoneInfo = await getZoneInfo(account.token, zone.zone_id);
        if (zoneInfo) {
          console.log(`  ✓ Zone ${zone.domain} (${zone.zone_id}) 可访问`);
        } else {
          console.error(`  ✗ Zone ${zone.domain} (${zone.zone_id}) 不可访问`);
        }
      }
    }
  }
  console.log(`\n[Token验证] 验证完成\n`);
}

// 抓取数据 & 写文件
async function updateData() {
  try {
    console.log(`[数据更新] 开始更新数据... ${new Date().toLocaleString()}`);

    // 在第一次更新时验证Token
    if (!updateData.tokenValidated) {
      await validateAllTokens();
      updateData.tokenValidated = true;
    }

    const payload = { accounts: [] };

    for (const [accIndex, acc] of CFG.accounts.entries()) {
      console.log(`  处理账户 ${accIndex + 1}/${CFG.accounts.length}: ${acc.name}`);
      const accData = { name: acc.name, zones: [] };

      for (const [zoneIndex, z] of acc.zones.entries()) {
        try {
          console.log(`    处理 Zone ${zoneIndex + 1}/${acc.zones.length}: ${z.domain}`);

          // 获取天级数据（用于7天和30天显示）
          const daysSince = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10); // 45天前
          const daysUntil = new Date().toISOString().slice(0, 10); // 今天

          console.log(`    查询天级数据时间范围: ${daysSince} 到 ${daysUntil}`);

          const daysQuery = `
            query($zone: String!, $since: Date!, $until: Date!) {
              viewer {
                zones(filter: {zoneTag: $zone}) {
                  httpRequests1dGroups(
                    filter: {date_geq: $since, date_leq: $until}
                    limit: 100
                    orderBy: [date_DESC]
                  ) {
                    dimensions {
                      date
                    }
                    sum {
                      requests
                      bytes
                      threats
                      cachedRequests
                      cachedBytes
                    }
                  }
                }
              }
            }`;

          // 获取小时级数据（用于1天和3天显示）
          const hoursSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7天前
          const hoursUntil = new Date().toISOString(); // 现在

          console.log(`    查询小时级数据时间范围: ${hoursSince} 到 ${hoursUntil}`);

          const hoursQuery = `
            query($zone: String!, $since: Time!, $until: Time!) {
              viewer {
                zones(filter: {zoneTag: $zone}) {
                  httpRequests1hGroups(
                    filter: {datetime_geq: $since, datetime_leq: $until}
                    limit: 200
                    orderBy: [datetime_DESC]
                  ) {
                    dimensions {
                      datetimeHour
                    }
                    sum {
                      requests
                      bytes
                      threats
                      cachedRequests
                      cachedBytes
                    }
                  }
                }
              }
            }`;

          // 获取地理位置数据（过去7天）
          const geoSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10); // 7天前
          const geoUntil = new Date().toISOString().slice(0, 10); // 今天

          console.log(`    查询地理位置数据时间范围: ${geoSince} 到 ${geoUntil}`);

          const geoQuery = `
            query($zone: String!, $since: Date!, $until: Date!) {
              viewer {
                zones(filter: {zoneTag: $zone}) {
                  httpRequestsAdaptiveGroups(
                    filter: {date_geq: $since, date_leq: $until}
                    limit: 15
                    orderBy: [sum_requests_DESC]
                  ) {
                    dimensions {
                      clientCountryName
                    }
                    sum {
                      requests
                      bytes
                      threats
                    }
                  }
                }
              }
            }`;

          // 并行获取天级、小时级和地理位置数据
          const [daysRes, hoursRes, geoRes] = await Promise.all([
            axios.post(
              'https://api.cloudflare.com/client/v4/graphql',
              { query: daysQuery, variables: { zone: z.zone_id, since: daysSince, until: daysUntil } },
              {
                headers: {
                  'Authorization': `Bearer ${acc.token}`,
                  'Content-Type': 'application/json'
                },
                timeout: 30000
              }
            ),
            axios.post(
              'https://api.cloudflare.com/client/v4/graphql',
              { query: hoursQuery, variables: { zone: z.zone_id, since: hoursSince, until: hoursUntil } },
              {
                headers: {
                  'Authorization': `Bearer ${acc.token}`,
                  'Content-Type': 'application/json'
                },
                timeout: 30000
              }
            ),
            axios.post(
              'https://api.cloudflare.com/client/v4/graphql',
              { query: geoQuery, variables: { zone: z.zone_id, since: geoSince, until: geoUntil } },
              {
                headers: {
                  'Authorization': `Bearer ${acc.token}`,
                  'Content-Type': 'application/json'
                },
                timeout: 30000
              }
            )
          ]);

          const zoneData = { domain: z.domain, raw: [], rawHours: [], geography: [] };

          // 处理天级数据
          if (daysRes.data.errors) {
            console.error(`    Zone ${z.domain} 天级数据API错误:`, daysRes.data.errors);
            zoneData.error = daysRes.data.errors[0]?.message || '天级数据API请求失败';
          } else if (daysRes.data.data?.viewer?.zones?.[0]?.httpRequests1dGroups) {
            const rawData = daysRes.data.data.viewer.zones[0].httpRequests1dGroups;
            console.log(`    Zone ${z.domain} 天级数据获取成功: ${rawData.length} 条记录`);
            zoneData.raw = rawData;

            if (rawData.length > 0) {
              const latestDates = rawData.slice(0, 3).map(d => d.dimensions.date);
              console.log(`    最新天级数据日期: ${latestDates.join(', ')}`);
            }
          }

          // 处理小时级数据
          if (hoursRes.data.errors) {
            console.error(`    Zone ${z.domain} 小时级数据API错误:`, hoursRes.data.errors);
            if (!zoneData.error) {
              zoneData.error = hoursRes.data.errors[0]?.message || '小时级数据API请求失败';
            }
          } else if (hoursRes.data.data?.viewer?.zones?.[0]?.httpRequests1hGroups) {
            const rawHoursData = hoursRes.data.data.viewer.zones[0].httpRequests1hGroups;
            console.log(`    Zone ${z.domain} 小时级数据获取成功: ${rawHoursData.length} 条记录`);
            zoneData.rawHours = rawHoursData;

            if (rawHoursData.length > 0) {
              const latestHours = rawHoursData.slice(0, 3).map(d => d.dimensions.datetimeHour);
              console.log(`    最新小时级数据时间: ${latestHours.join(', ')}`);
            }
          }

          // 处理地理位置数据
          if (geoRes.data.errors) {
            console.error(`    Zone ${z.domain} 地理位置数据API错误:`, geoRes.data.errors);
            if (!zoneData.error) {
              zoneData.error = geoRes.data.errors[0]?.message || '地理位置数据API请求失败';
            }
          } else if (geoRes.data.data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups) {
            const rawGeoData = geoRes.data.data.viewer.zones[0].httpRequestsAdaptiveGroups;
            console.log(`    Zone ${z.domain} 地理位置数据获取成功: ${rawGeoData.length} 条记录`);
            zoneData.geography = rawGeoData;

            if (rawGeoData.length > 0) {
              const topCountries = rawGeoData.slice(0, 5).map(d => `${d.dimensions.clientCountryName}: ${d.sum.requests}`);
              console.log(`    前5个国家/地区: ${topCountries.join(', ')}`);
            }
          }

          accData.zones.push(zoneData);
        } catch (error) {
          console.error(`    Zone ${z.domain} 处理失败:`, error.message);
          accData.zones.push({
            domain: z.domain,
            raw: [],
            rawHours: [],
            geography: [],
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
cron.schedule('0 */2 * * *', updateData);

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