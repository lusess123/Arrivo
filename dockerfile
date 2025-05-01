# 基础镜像
FROM  node:20-bullseye-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apt-get update && apt-get install -y ca-certificates

# 创建一个目录用于存放pnpm store并设置缓存挂载点
RUN mkdir -p /usr/local/pnpm-store
VOLUME /usr/local/pnpm-store


ENV PM_STORE_DIR=/usr/local/pnpm-store
ENV PM_STORE_DIR=/usr/local/pnpm-store

ARG USE_MIRROR=false

RUN if [ "$USE_MIRROR" = "true" ]; then \
      npm config set registry https://registry.npmmirror.com/ && \
      npm install -g pnpm && \
      pnpm config set registry https://registry.npmmirror.com/ && \
      echo "disturl=https://npmmirror.com/mirrors/node" >> /etc/environment && \
      echo "PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma" >> /etc/environment && \
      echo "bcrypt_lib_binary_host_mirror=https://registry.npmmirror.com/" >> /etc/environment && \
      echo "node_bcrypt_binary_host_mirror=https://ghproxy.com/https://github.com/kelektiv/node.bcrypt.js/releases/download/" >> /etc/environment && \
      echo "NODE_PRE_GYP_MIRROR=https://registry.npmmirror.com/binary.html?path=node-pre-gyp/" >> /etc/environment; \
    else \
      npm install -g pnpm; \
    fi

RUN npm install -g pnpm

WORKDIR /usr/src/app
COPY package.json package.json
# 明确地移除node_modules，再安装依赖
RUN rm -rf node_modules && pnpm store prune && pnpm install 
# RUN --mount=type=cache,target=/usr/local/pnpm-store pnpm install 

# 依赖安装阶段
FROM base AS dep
VOLUME /usr/src/app/node_modules
COPY packages/arrivo-fe/package.json packages/arrivo-fe/package.json
COPY packages/arrivo-server/package.json packages/arrivo-server/package.json
COPY packages/arrivo-db/package.json packages/arrivo-db/package.json
COPY packages/arrivo-manage/package.json packages/arrivo-manage/package.json


COPY pnpm-lock.yaml   pnpm-lock.yaml
COPY package.json package.json
COPY pnpm-workspace.yaml pnpm-workspace.yaml
COPY tsconfig.json tsconfig.json
RUN rm -rf node_modules
RUN --mount=type=cache,target=/usr/local/pnpm-store pnpm install 

# 设置环境变量
ENV SERVER_HOST=http://host.docker.internal:3025
ENV jwt_secret=secretjwt2025prod
ENV NODE_ENV=production

FROM dep AS db_build
COPY packages/arrivo-db packages/arrivo-db
RUN pnpm run db-build

# 构建阶段
FROM db_build AS server_build
COPY packages/arrivo-server packages/arrivo-server
RUN pnpm run server-build

# 替换软件源并安装 python3 和 pip



FROM server_build AS fe_build
ARG GIT_COMMIT_TIME=true
ARG GIT_COMMIT_MESSAGE=true
ENV REACT_APP_GIT_COMMIT_TIME=$GIT_COMMIT_TIME
ENV REACT_APP_GIT_COMMIT_MESSAGE=$GIT_COMMIT_MESSAGE



COPY packages/arrivo-fe packages/arrivo-fe
RUN pnpm run fe-build

FROM server_build AS manage_build
ARG GIT_COMMIT_TIME=true
ARG GIT_COMMIT_MESSAGE=true
ENV REACT_APP_GIT_COMMIT_TIME=$GIT_COMMIT_TIME
ENV REACT_APP_GIT_COMMIT_MESSAGE=$GIT_COMMIT_MESSAGE



COPY packages/arrivo-manage packages/arrivo-manage
RUN pnpm run manage-build




# 服务端镜像
FROM server_build AS arrivo-server
WORKDIR /usr/src/app/packages/arrivo-server

# Set proxy environment variables conditionally
ARG USE_MIRROR=true
RUN if [ "$USE_MIRROR" = "true" ]; then \
    echo "export https_proxy=http://host.docker.internal:7890" >> /etc/profile.d/proxy.sh && \
    echo "export http_proxy=http://host.docker.internal:7890" >> /etc/profile.d/proxy.sh && \
    echo "export all_proxy=socks5://host.docker.internal:7890" >> /etc/profile.d/proxy.sh; \
    fi

# 安装Python和虚拟环境相关工具
RUN apt-get update && \
    apt-get install -y python3 python3-pip python3-venv && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 创建Python虚拟环境并安装依赖
RUN python3 -m venv venv && \
    ./venv/bin/pip install --upgrade --no-cache-dir -i https://pypi.tuna.tsinghua.edu.cn/simple pip && \
    ./venv/bin/pip install --no-cache-dir -i https://pypi.tuna.tsinghua.edu.cn/simple edge-tts

# 设置 Python 环境变量
ENV PYTHON_ENV='cd /usr/src/app/packages/arrivo-server && source ./venv/bin/activate &&'

EXPOSE 3000
CMD [ "pnpm", "start:pm2"]


# 代理镜像
# FROM agent_build AS vvvo-agent
# WORKDIR /usr/src/app/packages/vvvo-agent
# EXPOSE 8001
# CMD [ "pnpm", "start:pm2"]

# 前端镜像和 Nginx 集成
FROM nginx:alpine AS arrivo-fe
COPY --from=fe_build /usr/src/app/packages/arrivo-fe/dist /usr/share/nginx/html
COPY --from=fe_build /usr/src/app/packages/arrivo-fe/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]


FROM nginx:alpine AS arrivo-manage
COPY --from=manage_build /usr/src/app/packages/arrivo-manage/dist /usr/share/nginx/html
COPY --from=manage_build /usr/src/app/packages/arrivo-manage/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
