# Cloudflare Analytics Dashboard

多账户、多Zone的Cloudflare流量分析仪表盘

## 功能特性
- 支持多个Cloudflare账户
- 多Zone流量监控
- 实时数据图表展示
- 30天历史数据分析

## 技术栈
- 前端：React + Recharts
- 后端：Node.js + Express
- 部署：Docker + Nginx

## 快速开始

### 本地开发

1. 克隆项目
```bash
git clone <repository-url>
cd Cloudflare-Analytics
```

2. 配置Cloudflare账户
编辑 `server/zones.yml` 文件：
```yaml
accounts:
  - name: "账户名称"
    token: "你的Cloudflare API Token"
    zones:
      - domain: "example.com"
        zone_id: "你的Zone ID"
```

3. 启动服务
```bash
# 使用Docker Compose
docker-compose up -d

# 或者直接构建
docker build -t cf-analytics .
docker run -p 80:80 cf-analytics
```

### 环境变量
- `PORT`: API端口 (默认: 4000)
- `NGINX_PORT`: Nginx端口 (默认: 80)

## GitHub Actions

本项目使用GitHub Actions自动构建并推送Docker镜像到GitHub Container Registry。

构建触发条件：
- 推送到 `main` 或 `master` 分支
- 创建Pull Request
- 手动触发

## 项目结构
```
├── web/                    # 前端React应用
├── server/                 # 后端API服务
├── .github/workflows/      # GitHub Actions配置
├── dockerfile              # Docker构建配置
├── nginx.conf.template     # Nginx配置模板
└── start.sh               # 容器启动脚本
```