# 安裝後端的docker
# 會建立兩份Image，分別是builder(安裝dev依賴、prisma generate)跟runner(安裝執行時必要的東西)

# ─── Stage 1: build（安裝依賴 + prisma generate）───
FROM node:22-alpine AS builder

WORKDIR /app

# 先只 copy package files，讓 Docker cache npm install
# 複製當前路徑(/backend)中，開頭是package的所有json檔案到docker中的root(/app)
COPY package*.json ./ 
COPY prisma ./prisma

# 完整安裝所有依賴（含 devDependencies，因為要跑 prisma generate）
RUN npm ci

# npm = 套件管理器（install、run scripts、publish）
# npx = 執行 node_modules/.bin/ 的 CLI 工具
RUN npx prisma generate

# ─── Stage 2: runtime（只保留執行時必要的東西）───

FROM node:22-alpine AS runtime

WORKDIR  /app

COPY package*.json ./

# npm ci = 「照 lock 檔乾淨裝」，--omit=dev = 「只裝 runtime 用的、跳過測試/build 工具」
RUN npm ci --omit=dev

# 從上面的builder拿出prisma相關的東西，之前安裝過了這邊就不要重複安裝
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

COPY src ./src

# Container內預設用root執行——這在安全性上不好。USER node切到權限較低的node使用者，之後所有指令都用它跑。
USER node

# 對外聲明 port（純文件用途）
EXPOSE 3000

# 這個指令相當於我在terminal輸入「npm start」，因爲我在package.json中寫script{"start": "node src/server.js"}
CMD ["node", "src/server.js"]