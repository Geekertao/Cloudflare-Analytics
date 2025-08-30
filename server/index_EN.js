import express from 'express';
import cron from 'node-cron';
import axios from 'axios';
import fs from 'fs/promises';
import yaml from 'js-yaml';
import path from 'path';

const OUT = './data/analytics.json';
const PORT = process.env.PORT || 4000;

// Configuration loading function
function loadConfig() {
    // Priority 1: Environment variable configuration
    if (process.env.CF_CONFIG) {
        try {
            return JSON.parse(process.env.CF_CONFIG);
        } catch (e) {
            console.error('CF_CONFIG environment variable format error:', e.message);
        }
    }

    // Priority 2: Parse tokens and zones from environment variables
    const config = { accounts: [] };

    // Support for CF_TOKENS and CF_ZONES shorthand format
    if (process.env.CF_TOKENS && process.env.CF_ZONES) {
        const tokens = process.env.CF_TOKENS.split(',').map(t => t.trim());
        const zones = process.env.CF_ZONES.split(',').map(z => z.trim());
        const domains = process.env.CF_DOMAINS ? process.env.CF_DOMAINS.split(',').map(d => d.trim()) : zones;

        if (tokens.length > 0 && zones.length > 0) {
            config.accounts.push({
                name: process.env.CF_ACCOUNT_NAME || "Default Account",
                token: tokens[0],
                zones: zones.map((zone_id, index) => ({
                    zone_id,
                    domain: domains[index] || zone_id
                }))
            });
        }
    }

    // Support for CF_TOKENS_1, CF_ZONES_1, CF_DOMAINS_1 multi-account format
    let accountIndex = 1;
    while (process.env[`CF_TOKENS_${accountIndex}`]) {
        const tokens = process.env[`CF_TOKENS_${accountIndex}`].split(',').map(t => t.trim());
        const zones = process.env[`CF_ZONES_${accountIndex}`].split(',').map(z => z.trim());
        const domains = process.env[`CF_DOMAINS_${accountIndex}`] ?
            process.env[`CF_DOMAINS_${accountIndex}`].split(',').map(d => d.trim()) : zones;

        if (tokens.length > 0 && zones.length > 0) {
            config.accounts.push({
                name: process.env[`CF_ACCOUNT_NAME_${accountIndex}`] || `Account${accountIndex}`,
                token: tokens[0],
                zones: zones.map((zone_id, index) => ({
                    zone_id,
                    domain: domains[index] || zone_id
                }))
            });
        }
        accountIndex++;
    }

    // Priority 3: Configuration file
    if (config.accounts.length === 0) {
        try {
            const fileConfig = yaml.load(fs.readFileSync(new URL('./zones.yml', import.meta.url)));
            return fileConfig;
        } catch (e) {
            console.error('Cannot load configuration file:', e.message);
        }
    }

    return config;
}

// API Token validation function
async function validateToken(token, zoneName) {
    try {
        console.log(`[Token Validation] Validating Token access for Zone ${zoneName}...`);

        // 1. First test basic API access
        const testQuery = `
      query {
        viewer {
          zones(limit: 50) {
            zoneTag
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
            console.error(`[Token Validation] API access failed:`, response.data.errors);
            return {
                valid: false,
                error: 'API access denied',
                details: response.data.errors
            };
        }

        if (!response.data.data?.viewer?.zones) {
            console.error(`[Token Validation] Token cannot access any Zone`);
            return {
                valid: false,
                error: 'Token has no Zone access permissions'
            };
        }

        const accessibleZones = response.data.data.viewer.zones;
        console.log(`[Token Validation] Token can access ${accessibleZones.length} Zones`);

        return {
            valid: true,
            accessibleZones: accessibleZones.length,
            zones: accessibleZones
        };

    } catch (error) {
        console.error(`[Token Validation] Error during validation:`, error.message);
        if (error.response?.status === 401) {
            return {
                valid: false,
                error: 'Token invalid or expired',
                httpStatus: 401
            };
        }
        if (error.response?.status === 403) {
            return {
                valid: false,
                error: 'Insufficient token permissions',
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

// Function to get Zone information
async function getZoneInfo(token, zoneId) {
    try {
        const query = `
      query($zoneId: String!) {
        viewer {
          zones(filter: {zoneTag: $zoneId}) {
            zoneTag
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
            console.error(`[Zone Info] Zone ${zoneId} query failed:`, response.data.errors);
            return null;
        }

        const zones = response.data.data?.viewer?.zones;
        if (!zones || zones.length === 0) {
            console.error(`[Zone Info] Zone ${zoneId} does not exist or no access permissions`);
            return null;
        }

        return zones[0];
    } catch (error) {
        console.error(`[Zone Info] Error querying Zone ${zoneId}:`, error.message);
        return null;
    }
}

const CFG = loadConfig();

// Validate all configured tokens
async function validateAllTokens() {
    console.log(`[Token Validation] Starting validation of ${CFG.accounts.length} account tokens...`);

    for (const [index, account] of CFG.accounts.entries()) {
        console.log(`\n[Token Validation] Validating account ${index + 1}: ${account.name}`);
        const validation = await validateToken(account.token, account.name);

        if (!validation.valid) {
            console.error(`⚠️ [Error] Account ${account.name} token validation failed:`, validation.error);
            if (validation.httpStatus === 401) {
                console.error(`ℹ️ Please check:`);
                console.error(`   1. If the token is correct (without extra spaces or special characters)`);
                console.error(`   2. If the token has expired`);
                console.error(`   3. If the token has 'Analytics:Read' permissions`);
                console.error(`   4. If the token has correct Zone access permissions`);
            }
        } else {
            console.log(`✓ Account ${account.name} token validation successful, can access ${validation.accessibleZones} Zones`);

            // Validate specific Zone access permissions
            for (const zone of account.zones) {
                const zoneInfo = await getZoneInfo(account.token, zone.zone_id);
                if (zoneInfo) {
                    console.log(`  ✓ Zone ${zone.domain} (${zone.zone_id}) is accessible`);
                } else {
                    console.error(`  ✗ Zone ${zone.domain} (${zone.zone_id}) is not accessible`);
                }
            }
        }
    }
    console.log(`\n[Token Validation] Validation complete\n`);
}

// Fetch data & write file
async function updateData() {
    try {
        console.log(`[Data Update] Starting data update... ${new Date().toLocaleString()}`);

        // Validate tokens on first update
        if (!updateData.tokenValidated) {
            await validateAllTokens();
            updateData.tokenValidated = true;
        }

        const payload = { accounts: [] };

        for (const [accIndex, acc] of CFG.accounts.entries()) {
            console.log(`  Processing account ${accIndex + 1}/${CFG.accounts.length}: ${acc.name}`);
            const accData = { name: acc.name, zones: [] };

            for (const [zoneIndex, z] of acc.zones.entries()) {
                try {
                    console.log(`    Processing Zone ${zoneIndex + 1}/${acc.zones.length}: ${z.domain}`);

                    // Get daily data (for 7-day and 30-day display)
                    const daysSince = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10); // 45 days ago
                    const daysUntil = new Date().toISOString().slice(0, 10); // today

                    console.log(`    Daily data query timeframe: ${daysSince} to ${daysUntil}`);

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

                    // Get hourly data (for 1-day and 3-day display, limited to 3 days)
                    const hoursSince = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(); // 3 days ago
                    const hoursUntil = new Date().toISOString(); // now

                    /* ====== FORK user-specific feature: Single day data starting from today 00:00 ======
                     * If you want single day data to display from today 00:00 instead of the last 24 hours,
                     * uncomment the code block below and comment out the default code above.
                     * 
                     * Note: This will change how single day data is displayed, from "past 24 hours" to "today from 00:00"
                     * You will also need to modify the data processing logic in the frontend accordingly.
                     */
                    /*
                    // Get hourly data - custom version: starting from today 00:00
                    const now = new Date();
                    const todayStart = new Date();
                    todayStart.setHours(0, 0, 0, 0); // today 00:00:00
                    
                    // To get sufficient historical data, still fetch from the last 3 days
                    const hoursStartDate = new Date(todayStart);
                    hoursStartDate.setDate(hoursStartDate.getDate() - 2); // Start from 3 days ago
          
                    const hoursSince = hoursStartDate.toISOString();
                    const hoursUntil = now.toISOString();
                    
                    console.log(`    Hourly data query timeframe (today 00:00 mode): ${hoursSince} to ${hoursUntil}`);
                    console.log(`    Today start time: ${todayStart.toISOString()}`);
                    */

                    console.log(`    Hourly data query timeframe: ${hoursSince} to ${hoursUntil}`);

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
                      datetime
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

                    // Get geographic location data (today only, following API timeframe limitations)
                    const today = new Date().toISOString().slice(0, 10); // today's date
                    const geoSince = today; // from today
                    const geoUntil = today; // until today

                    console.log(`    Geographic location data query timeframe: ${geoSince} to ${geoUntil}`);

                    const geoQuery = `
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
                      countryMap {
                        bytes
                        requests
                        threats
                        clientCountryName
                      }
                    }
                  }
                }
              }
            }`;

                    // Fetch daily, hourly, and geographic data in parallel
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

                    // Process daily data
                    if (daysRes.data.errors) {
                        console.error(`    Zone ${z.domain} daily data API error:`, daysRes.data.errors);
                        zoneData.error = daysRes.data.errors[0]?.message || 'Daily data API request failed';
                    } else if (daysRes.data.data?.viewer?.zones?.[0]?.httpRequests1dGroups) {
                        const rawData = daysRes.data.data.viewer.zones[0].httpRequests1dGroups;
                        console.log(`    Zone ${z.domain} daily data successfully retrieved: ${rawData.length} records`);
                        zoneData.raw = rawData;

                        if (rawData.length > 0) {
                            const latestDates = rawData.slice(0, 3).map(d => d.dimensions.date);
                            console.log(`    Latest daily data dates: ${latestDates.join(', ')}`);
                        }
                    }

                    // Process hourly data
                    if (hoursRes.data.errors) {
                        console.error(`    Zone ${z.domain} hourly data API error:`, hoursRes.data.errors);
                        if (!zoneData.error) {
                            zoneData.error = hoursRes.data.errors[0]?.message || 'Hourly data API request failed';
                        }
                    } else if (hoursRes.data.data?.viewer?.zones?.[0]?.httpRequests1hGroups) {
                        const rawHoursData = hoursRes.data.data.viewer.zones[0].httpRequests1hGroups;
                        console.log(`    Zone ${z.domain} hourly data successfully retrieved: ${rawHoursData.length} records`);
                        zoneData.rawHours = rawHoursData;

                        if (rawHoursData.length > 0) {
                            const latestHours = rawHoursData.slice(0, 3).map(d => d.dimensions.datetime);
                            console.log(`    Latest hourly data times: ${latestHours.join(', ')}`);
                        }
                    }

                    // Process geographic location data
                    if (geoRes.data.errors) {
                        console.error(`    Zone ${z.domain} geographic location data API error:`, geoRes.data.errors);
                        if (!zoneData.error) {
                            zoneData.error = geoRes.data.errors[0]?.message || 'Geographic location data API request failed';
                        }
                    } else if (geoRes.data.data?.viewer?.zones?.[0]?.httpRequests1dGroups) {
                        const rawGeoData = geoRes.data.data.viewer.zones[0].httpRequests1dGroups;
                        console.log(`    Zone ${z.domain} geographic location data successfully retrieved: ${rawGeoData.length} records`);

                        // Aggregate geographic location data (summarize today's data by country)
                        const countryStats = {};
                        rawGeoData.forEach(record => {
                            // Process countryMap array, each record may contain data from multiple countries
                            if (record.sum?.countryMap && Array.isArray(record.sum.countryMap)) {
                                record.sum.countryMap.forEach(countryData => {
                                    const country = countryData.clientCountryName;
                                    if (country && country !== 'Unknown' && country !== '') {
                                        if (!countryStats[country]) {
                                            countryStats[country] = {
                                                dimensions: { clientCountryName: country },
                                                sum: { requests: 0, bytes: 0, threats: 0 }
                                            };
                                        }
                                        // Use actual data from countryMap
                                        countryStats[country].sum.requests += countryData.requests || 0;
                                        countryStats[country].sum.bytes += countryData.bytes || 0;
                                        countryStats[country].sum.threats += countryData.threats || 0;
                                    }
                                });
                            }
                        });

                        // Convert to array and sort
                        zoneData.geography = Object.values(countryStats)
                            .sort((a, b) => b.sum.requests - a.sum.requests)
                            .slice(0, 15); // Keep only top 15 countries

                        if (zoneData.geography.length > 0) {
                            const topCountries = zoneData.geography.slice(0, 5).map(d =>
                                `${d.dimensions.clientCountryName}: ${d.sum.requests}`);
                            console.log(`    Top 5 countries/regions: ${topCountries.join(', ')}`);
                        }
                    }

                    accData.zones.push(zoneData);
                } catch (error) {
                    console.error(`    Zone ${z.domain} processing failed:`, error.message);
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
        console.log(`[Data Update] Data update complete: ${payload.accounts.length} accounts`);
    } catch (error) {
        console.error('[Data Update] Global error:', error.message);
    }
}
await updateData();
cron.schedule('0 */2 * * *', updateData);

const app = express();

// Add CORS support
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

// Static file service
app.use('/data', express.static('./data', {
    setHeaders: (res, path) => {
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
    }
}));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API status endpoint
app.get('/api/status', (req, res) => {
    const dataExists = require('fs').existsSync('./data/analytics.json');
    res.json({
        status: 'running',
        dataExists,
        accounts: CFG.accounts.length,
        timestamp: new Date().toISOString()
    });
});

// Language detection API endpoint
app.get('/api/language', (req, res) => {
    const acceptLanguage = req.headers['accept-language'] || '';
    const language = acceptLanguage.includes('zh') ? 'zh' : 'en';
    res.json({ language });
});

app.listen(PORT, () => {
    console.log(`API listening on ${PORT}`);
    console.log(`Configuration loaded successfully: ${CFG.accounts.length} accounts`);
    CFG.accounts.forEach((acc, index) => {
        console.log(`  Account ${index + 1}: ${acc.name} (${acc.zones.length} zones)`);
    });
});