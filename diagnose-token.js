#!/usr/bin/env node

/**
 * Cloudflare API Token 诊断脚本
 * 使用方法: node diagnose-token.js YOUR_TOKEN_HERE
 */

import axios from 'axios';

const token = process.argv[2];

if (!token) {
    console.error('❌ 错误: 请提供API Token');
    console.error('使用方法: node diagnose-token.js YOUR_TOKEN_HERE');
    process.exit(1);
}

console.log('🔍 Cloudflare API Token 诊断工具');
console.log('================================\n');

async function diagnoseToken(token) {
    console.log(`🧪 测试Token: ${token.substring(0, 10)}...${token.substring(token.length - 10)}`);
    console.log('');

    try {
        // 测试1: 基本API访问
        console.log('📡 测试1: 基本API访问...');
        const basicResponse = await axios.post(
            'https://api.cloudflare.com/client/v4/graphql',
            {
                query: `
          query {
            viewer {
              email
            }
          }
        `
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            }
        );

        if (basicResponse.data.errors) {
            console.error('❌ 基本API访问失败:', basicResponse.data.errors[0].message);
            return false;
        }

        console.log(`✅ Token有效，关联邮箱: ${basicResponse.data.data.viewer.email}`);
        console.log('');

        // 测试2: Zone访问权限
        console.log('🏢 测试2: Zone访问权限...');
        const zoneResponse = await axios.post(
            'https://api.cloudflare.com/client/v4/graphql',
            {
                query: `
          query {
            viewer {
              zones(limit: 10) {
                zoneTag
                name
                status
              }
            }
          }
        `
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            }
        );

        if (zoneResponse.data.errors) {
            console.error('❌ Zone访问失败:', zoneResponse.data.errors[0].message);
            return false;
        }

        const zones = zoneResponse.data.data.viewer.zones;
        console.log(`✅ 可访问 ${zones.length} 个Zone:`);
        zones.forEach(zone => {
            console.log(`   - ${zone.name} (${zone.zoneTag}) [${zone.status}]`);
        });
        console.log('');

        // 测试3: Analytics权限
        console.log('📊 测试3: Analytics API权限...');
        if (zones.length > 0) {
            const testZone = zones[0];
            const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
            const until = new Date().toISOString().slice(0, 10);

            const analyticsResponse = await axios.post(
                'https://api.cloudflare.com/client/v4/graphql',
                {
                    query: `
            query($zone: String!, $since: Date!, $until: Date!) {
              viewer {
                zones(filter: {zoneTag: $zone}) {
                  httpRequests1dGroups(filter: {date_geq: $since, date_leq: $until}) {
                    dimensions { date }
                    sum { requests bytes threats }
                  }
                }
              }
            }
          `,
                    variables: {
                        zone: testZone.zoneTag,
                        since: since,
                        until: until
                    }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 15000
                }
            );

            if (analyticsResponse.data.errors) {
                console.error('❌ Analytics API访问失败:', analyticsResponse.data.errors[0].message);
                console.error('🔧 请确保Token具有以下权限:');
                console.error('   - Account | Analytics | Read');
                console.error('   - Zone | Analytics | Read');
                return false;
            }

            const analyticsData = analyticsResponse.data.data.viewer.zones[0]?.httpRequests1dGroups || [];
            console.log(`✅ Analytics API正常，获取到 ${analyticsData.length} 条数据记录`);

            if (analyticsData.length > 0) {
                const sample = analyticsData[0];
                console.log(`   示例数据: ${sample.dimensions.date} - ${sample.sum.requests} 请求`);
            }
        } else {
            console.log('⚠️  无可用Zone，跳过Analytics测试');
        }

        console.log('');
        console.log('🎉 所有测试通过！Token配置正确。');
        console.log('');
        console.log('📋 环境变量配置示例:');
        if (zones.length > 0) {
            const zoneIds = zones.map(z => z.zoneTag).join(',');
            const domains = zones.map(z => z.name).join(',');
            console.log(`CF_TOKENS="${token}"`);
            console.log(`CF_ZONES="${zoneIds}"`);
            console.log(`CF_DOMAINS="${domains}"`);
        }

        return true;

    } catch (error) {
        console.error('');
        console.error('❌ 诊断过程中发生错误:');

        if (error.response?.status === 401) {
            console.error('🔑 401 Unauthorized - Token认证失败');
            console.error('   可能原因:');
            console.error('   1. Token无效或已过期');
            console.error('   2. Token格式错误（检查是否有多余空格）');
            console.error('   3. Token类型错误（需要API Token，不是API Key）');
        } else if (error.response?.status === 403) {
            console.error('🚫 403 Forbidden - 权限不足');
            console.error('   可能原因:');
            console.error('   1. Token缺少必需的权限');
            console.error('   2. Token无法访问目标资源');
        } else if (error.code === 'ENOTFOUND') {
            console.error('🌐 网络连接错误');
            console.error('   请检查网络连接和DNS设置');
        } else {
            console.error(`   错误: ${error.message}`);
            if (error.response) {
                console.error(`   HTTP状态: ${error.response.status}`);
            }
        }

        console.error('');
        console.error('🛠️  修复建议:');
        console.error('   1. 访问 https://dash.cloudflare.com/profile/api-tokens');
        console.error('   2. 创建新的自定义Token');
        console.error('   3. 添加以下权限:');
        console.error('      - Account | Analytics | Read');
        console.error('      - Zone | Analytics | Read');
        console.error('      - Zone | Zone | Read');
        console.error('   4. 设置正确的资源范围（账户和Zone）');

        return false;
    }
}

diagnoseToken(token).then(success => {
    process.exit(success ? 0 : 1);
});