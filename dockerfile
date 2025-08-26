# ---------- 阶段 1：前端 ----------
FROM node:20-alpine AS web-build
WORKDIR /web

# 设置npm配置以提高可靠性
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-timeout 300000 && \
    npm config set fetch-retries 3 && \

COPY web/package*.json ./
# 安装所有依赖（包括devDependencies）以支持构建
# 使用--prefer-offline减少网络请求，增加重试机制
RUN npm ci --prefer-offline --no-audit --no-fund || \
    (sleep 10 && npm ci --prefer-offline --no-audit --no-fund) || \
    (sleep 30 && npm ci --prefer-offline --no-audit --no-fund)

COPY web/ ./
RUN npm run build

# ---------- 阶段 2：后端 ----------
FROM node:20-alpine AS api-build
WORKDIR /api

# 设置npm配置以提高可靠性
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-timeout 300000 && \
    npm config set fetch-retries 3 && \

COPY server/package*.json ./
# 确保lock文件与package.json同步，使用npm ci进行干净安装
RUN npm ci --only=production --prefer-offline --no-audit --no-fund || \
    (sleep 10 && npm ci --only=production --prefer-offline --no-audit --no-fund) || \
    (sleep 30 && npm ci --only=production --prefer-offline --no-audit --no-fund)

COPY server/ ./

# ---------- 阶段 3：运行 ----------
FROM nginx:1.25-alpine
RUN apk add --no-cache nodejs npm gettext   # gettext 提供 envsubst
COPY --from=web-build /web/build /usr/share/nginx/html
COPY --from=api-build /api /api
COPY nginx.conf.template /etc/nginx/nginx.conf.template
COPY start.sh /start.sh
RUN chmod +x /start.sh
WORKDIR /api
EXPOSE 80
CMD ["/start.sh"]