#!/bin/sh
# 设置默认值
export PORT=${PORT:-4000}
export NGINX_PORT=${NGINX_PORT:-80}

# 用环境变量替换模板
envsubst '${PORT} ${NGINX_PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# 启动 Node API + nginx
node /api/index.js &
exec nginx -g 'daemon off;'