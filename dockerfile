# ---------- 阶段 1：前端 ----------
FROM node:20-alpine AS web-build
WORKDIR /web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# ---------- 阶段 2：后端 ----------
FROM node:20-alpine AS api-build
WORKDIR /api
COPY server/package*.json ./
RUN npm ci
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