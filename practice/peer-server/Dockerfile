# 使用最新的 Node.js 版本
FROM node:latest

WORKDIR /usr/src/app

# 複製 package.json 和 package-lock.json 來安裝依賴
COPY package*.json ./

# 排除 node_modules 資料夾
RUN npm install --no-audit

# 複製其他文件，並排除 .env 和 node_modules
COPY . .
RUN rm -rf node_modules .env

# 曝露應用的端口
EXPOSE 9001

# 啟動應用時指定 .env 文件
CMD ["node", "peer.js"]
