# Cloudflare Analytics Dashboard

多账户、多 Zone 的 Cloudflare 流量分析仪表盘

中文 | [English](./README_EN.md)

## 功能特性

- 支持多个 Cloudflare 账户
- 多 Zone 流量监控
- 实时数据图表展示
- 30 天历史数据分析
- 单日和三日数据支持小时级精度
- 七天和三十天数据支持天级精度
- 多语言支持（中文/英文）
- **地理位置统计**：柱状图和列表显示前 5 个国家/地区的访问统计

## 技术栈

- 前端：React + Recharts
- 后端：Node.js + Express
- 部署：Docker + Nginx

## 快速开始

### 快速开始

#### 配置方式（支持环境变量！）

现在支持三种配置方式，按优先级排序：

##### 方式 1: 环境变量配置（推荐）

```bash
# 单账户配置
docker run -p 80:80 \
  -e CF_TOKENS="你的Cloudflare_API_Token" \
  -e CF_ZONES="zone_id_1,zone_id_2" \
  -e CF_DOMAINS="example.com,cdn.example.com" \
  -e CF_ACCOUNT_NAME="我的主账户" \
  geekertao/cloudflare-analytics

# 多账户配置
docker run -p 80:80 \
  -e CF_TOKENS_1="token1" \
  -e CF_ZONES_1="zone1,zone2" \
  -e CF_DOMAINS_1="site1.com,site2.com" \
  -e CF_ACCOUNT_NAME_1="账户1" \
  -e CF_TOKENS_2="token2" \
  -e CF_ZONES_2="zone3,zone4" \
  -e CF_DOMAINS_2="site3.com,site4.com" \
  -e CF_ACCOUNT_NAME_2="账户2" \
  geekertao/cloudflare-analytics

# JSON格式配置
docker run -p 80:80 \
  -e CF_CONFIG='{"accounts":[{"name":"主账号","token":"your_token","zones":[{"zone_id":"zone1","domain":"example.com"},{"zone_id":"zone2","domain":"cdn.example.com"}]}]}' \
  geekertao/cloudflare-analytics
```

##### 方式 2: Docker Compose 配置

编辑 `docker-compose.yml` 文件，修改 environment 部分：

```yaml
environment:
  - CF_TOKENS=your_cf_token_here
  - CF_ZONES=zone_id_1,zone_id_2
  - CF_DOMAINS=example.com,cdn.example.com
  - CF_ACCOUNT_NAME=我的主账户
```

##### 方式 3: 配置文件（传统方式）

编辑 `server/zones.yml` 文件：

```yaml
accounts:
  - name: "账户名称"
    token: "你的Cloudflare API Token"
    zones:
      - domain: "example.com"
        zone_id: "你的Zone ID"
```

#### 本地开发步骤

1. 克隆项目

```bash
git clone <repository-url>
cd Cloudflare-Analytics
```

2. 生成 package-lock.json 文件（重要！）

```bash
# 方法1：手动生成（推荐）
cd web && npm install --package-lock-only && cd ..
cd server && npm install --package-lock-only && cd ..

# 方法2：使用辅助脚本
node generate-lockfiles.js
```

3. 启动服务

```bash
# 使用Docker Compose（推荐）
docker-compose up -d

# 或者直接构建运行
docker build -t cf-analytics .
docker run -p 80:80 \
  -e CF_TOKENS="your_token" \
  -e CF_ZONES="your_zone_id" \
  -e CF_DOMAINS="your_domain" \
  cf-analytics
```

### Cloudflare API Token 配置

要使用此仪表盘，您需要创建一个具有以下权限的 Cloudflare API Token：

1. **Account | Analytics | Read**
2. **Zone | Analytics | Read**
3. **Zone | Zone | Read**

您可以在此处创建 Token：https://dash.cloudflare.com/profile/api-tokens

### 数据更新频率

- 后端数据更新：**每 2 小时更新一次**
- 数据精度：
  - **单日和三日数据**：小时级精度（最多 168 个数据点）
  - **七天和三十天数据**：天级精度（最多 45 个数据点）

### 解决 GitHub Actions 构建问题

如果遇到`npm ci`相关的构建错误，请确保：

1. 所有 package-lock.json 文件都已生成并提交到 git
2. package.json 和 package-lock.json 版本匹配
3. 运行上述第 2 步的命令重新生成 lock 文件

### 环境变量

- `NGINX_PORT`: Nginx 端口 (默认: 80)
- `CF_TOKENS`: Cloudflare API 令牌（单账户用逗号分隔）
- `CF_ZONES`: Zone ID（逗号分隔）
- `CF_DOMAINS`: 域名（逗号分隔）
- `CF_ACCOUNT_NAME`: 账户显示名称

## 功能概览

### 多语言支持

- 支持中文和英文界面
- 语言偏好本地保存
- 实时语言切换

### 数据可视化

- **统计卡片**：总请求数、总流量、总威胁数
- **缓存分析**：请求和带宽缓存统计，配有饼状图
- **流量趋势**：显示小时/天级趋势的折线图
- **响应式设计**：完美适配桌面端和移动端

### 时间范围选择

- **单日数据**：小时级数据（24 个数据点）
- **三日数据**：小时级数据（72 个数据点）
- **七日数据**：天级数据（7 个数据点）
- **三十日数据**：天级数据（30 个数据点）

## GitHub Actions

本项目使用 GitHub Actions 自动构建并推送 Docker 镜像到 GitHub Container Registry 和 Docker Hub。

构建触发条件：

- 推送到 `main` 或 `master` 分支
- 创建 Pull Request
- 手动触发

所需的 GitHub Secrets：

- `DOCKERHUB_USERNAME`: Docker Hub 用户名
- `DOCKERHUB_TOKEN`: Docker Hub 访问令牌

## 项目结构

```
├── web/                    # 前端React应用
├── server/                 # 后端API服务
├── .github/workflows/      # GitHub Actions配置
├── dockerfile              # Docker构建配置
├── nginx.conf.template     # Nginx配置模板
└── start.sh               # 容器启动脚本
```
