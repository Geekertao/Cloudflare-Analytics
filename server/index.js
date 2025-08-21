import express from 'express';
import cron from 'node-cron';
import axios from 'axios';
import fs from 'fs/promises';
import yaml from 'js-yaml';
import path from 'path';

const CFG = yaml.load(await fs.readFile(new URL('./zones.yml', import.meta.url)));
const OUT = './data/analytics.json';

const PORT = process.env.PORT || 4000;

// 抓数据 & 写文件
async function updateData() {
    const payload = { accounts: [] };
    for (const acc of CFG.accounts) {
        const accData = { name: acc.name, zones: [] };
        for (const z of acc.zones) {
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
                { headers: { Authorization: `Bearer ${acc.token}` } }
            );
            accData.zones.push({ domain: z.domain, raw: res.data.data.viewer.zones[0].httpRequests1dGroups });
        }
        payload.accounts.push(accData);
    }
    await fs.mkdir('./data', { recursive: true });
    await fs.writeFile(OUT, JSON.stringify(payload, null, 2));
}
await updateData();
cron.schedule('* * * * *', updateData);

const app = express();
app.use('/data', express.static('./data'));
app.listen(PORT, () => console.log(`API listening on ${PORT}`));