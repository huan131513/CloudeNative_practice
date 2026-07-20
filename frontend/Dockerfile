FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

# ARG = Dockerfile 內部變數，shell 讀不到、build 完消失
# ENV = 環境變數，shell 讀得到、保留在 image 內

# 這個 build 有個叫 VITE_API_URL 的參數，預設 /api，可以從 docker build --build-arg 覆蓋
# 因為同一份 Dockerfile 要能被多種環境重複用，所以在docker build時手動寫入當前環境的URL
ARG VITE_API_URL=/api 
ENV VITE_API_URL=${VITE_API_URL}

COPY . .
RUN npm run build

# ─── Stage 2: runtime（Nginx 服靜態檔）───
FROM nginx:alpine AS runtime

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# Nginx 官方 image 已有預設 CMD，這行可省，寫出來清楚
CMD ["nginx", "-g", "daemon off;"]