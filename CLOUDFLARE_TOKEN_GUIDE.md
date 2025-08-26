# 🛠️ Cloudflare API Token 配置指南

## 🚨 401 错误解决方案

当你看到 `Request failed with status code 401` 错误时，这通常表示 API Token 配置有问题。

## 📋 创建正确的 API Token

### 步骤 1：访问 Cloudflare Dashboard

1. 登录到你的 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 点击右上角的用户头像 → **My Profile**
3. 选择 **API Tokens** 标签页
4. 点击 **Create Token** 按钮

### 步骤 2：选择 Token 类型

选择 **Custom token** → **Get started**

### 步骤 3：配置 Token 权限

#### 必需权限设置：

1. **Permissions（权限）**：

   ```
   Account | Analytics | Read
   Zone    | Analytics | Read
   Zone    | Zone      | Read
   ```

2. **Account Resources（账户资源）**：

   ```
   Include | All accounts
   ```

   或选择特定账户

3. **Zone Resources（区域资源）**：
   ```
   Include | All zones
   ```
   或选择特定 Zone

### 步骤 4：可选配置

- **Client IP Address Filtering**: 可以留空（允许所有 IP）
- **TTL**: 设置 Token 有效期（建议至少 1 年）

### 步骤 5：创建和测试 Token

1. 点击 **Continue to summary**
2. 检查权限设置是否正确
3. 点击 **Create Token**
4. **复制 Token 并保存**（只显示一次！）

## 🔧 Token 验证

使用以下命令测试你的 Token：

```bash
curl -X POST "https://api.cloudflare.com/client/v4/graphql" \
     -H "Authorization: Bearer YOUR_TOKEN_HERE" \
     -H "Content-Type: application/json" \
     -d '{
       "query": "query { viewer { zones(limit: 1) { zoneTag name } } }"
     }'
```

成功的响应应该包含你的 Zone 信息。

## ⚙️ 配置环境变量

### 方法 1：单账户配置

```bash
docker run -p 80:80 \
  -e CF_TOKENS="your_token_here" \
  -e CF_ZONES="zone_id_1,zone_id_2" \
  -e CF_DOMAINS="example.com,cdn.example.com" \
  -e CF_ACCOUNT_NAME="我的主账户" \
  cf-analytics
```

### 方法 2：多账户配置

```bash
docker run -p 80:80 \
  -e CF_TOKENS_1="first_account_token" \
  -e CF_ZONES_1="zone_id_1,zone_id_2" \
  -e CF_DOMAINS_1="example.com,cdn.example.com" \
  -e CF_ACCOUNT_NAME_1="主账户" \
  -e CF_TOKENS_2="second_account_token" \
  -e CF_ZONES_2="zone_id_3" \
  -e CF_DOMAINS_2="test.net" \
  -e CF_ACCOUNT_NAME_2="副账户" \
  cf-analytics
```

### 方法 3：JSON 配置

```bash
docker run -p 80:80 \
  -e CF_CONFIG='{
    "accounts": [
      {
        "name": "主账户",
        "token": "your_token_here",
        "zones": [
          {"zone_id": "zone_id_1", "domain": "example.com"},
          {"zone_id": "zone_id_2", "domain": "cdn.example.com"}
        ]
      }
    ]
  }' \
  cf-analytics
```

## 🔍 常见问题排查

### 1. 401 Unauthorized Error

**可能原因：**

- Token 无效或已过期
- Token 权限不足
- Token 格式错误（包含多余空格等）

**解决方案：**

- 重新创建 Token，确保包含所有必需权限
- 检查 Token 是否包含空格或特殊字符
- 验证 Token 有效期

### 2. 403 Forbidden Error

**可能原因：**

- Token 缺少 Analytics 权限
- Token 无法访问指定的 Zone
- 账户级别权限不足

**解决方案：**

- 添加 `Account | Analytics | Read` 权限
- 添加 `Zone | Analytics | Read` 权限
- 确保 Zone Resources 包含目标 Zone

### 3. Zone 不可访问

**可能原因：**

- Zone ID 错误
- Token 没有访问该 Zone 的权限
- Zone 属于其他账户

**解决方案：**

- 在 Cloudflare Dashboard 中确认 Zone ID
- 确保 Token 的 Zone Resources 包含目标 Zone
- 验证 Zone 属于 Token 关联的账户

## 📍 获取 Zone ID

1. 登录 Cloudflare Dashboard
2. 选择你的域名
3. 在右侧边栏找到 **Zone ID**
4. 复制该 ID 用于配置

## 🔄 测试配置

启动容器后，查看日志：

```bash
docker logs container_name
```

你应该看到类似输出：

```
[Token验证] 验证账户 1: 主账户
✓ 账户 主账户 Token验证成功，可访问 2 个Zone
  ✓ Zone example.com (zone_id_1) 可访问
  ✓ Zone cdn.example.com (zone_id_2) 可访问
```

## 📚 参考文档

- [Cloudflare API Token 官方文档](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)
- [GraphQL Analytics API 文档](https://developers.cloudflare.com/analytics/graphql-api/)
- [API Token 权限配置](https://developers.cloudflare.com/analytics/graphql-api/getting-started/authentication/api-token-auth/)

---

**⚠️ 重要提醒：**

- 永远不要在日志或公共代码中暴露你的 API Token
- 定期轮换你的 API Token
- 使用最小权限原则配置 Token
