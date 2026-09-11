# Cloud-Native Full-Stack Todo App

一個刻意把「功能做到最單純」（Todo CRUD），但把「基礎設施 pipeline 做完整」的雲原生全端練習專案。

**本專案已練習為目的，每個檔案都是手寫，確保真的有練習到**

## 專案目標

用一個最簡單的 CRUD 應用，親手走完一條完整的雲原生工程鏈路：

> **前後端撰寫與 API 串接 → 資料庫 → 測試 → 容器化 → Kubernetes 部署 → CI/CD → 上雲（GKE）→ 監控與災難演練**

核心原則：

- **本地能做的別上雲** — 先用 kind 本機叢集驗證，再搬 GKE。
- **一次只加一層** — 每一層跑得起來，才往下一層走。
- **同一套 manifests 到處部署** — 本機 kind 與雲端 GKE 共用同一套 K8s 設定，環境差異靠 runtime 注入（12-Factor）。
- **雲端資源用完就砍** — 控制成本，建完 → 驗證 → 立刻刪。

App 本身只有一張表：`Todo(id, title, done, createdAt)`。學習重點是**整條 infra pipeline**，不是功能。

## 技術選型

| 環節 | 工具 |
|---|---|
| 前端 | Vite + React（SPA，Nginx 送靜態檔） |
| 後端 | Node.js + Express |
| ORM | Prisma |
| 資料庫 | PostgreSQL |
| 單元 / 元件測試 | Vitest（後端 mock Prisma、前端 jsdom + mock fetch） |
| E2E 測試 | Playwright |
| 容器化 | Docker（多階段 build）+ Docker Compose |
| 本地 K8s | kind |
| 雲端 K8s | GKE Autopilot |
| Image 倉庫 | Artifact Registry (GCP) |
| CI/CD | GitHub Actions（WIF 免金鑰認證） |
| 監控 | kube-prometheus-stack（Prometheus + Grafana） |
| 自動擴縮 | HorizontalPodAutoscaler (HPA) |

## 系統架構

```
使用者瀏覽器
   │
   ▼
Ingress（本機 ingress-nginx / GKE 亦用 nginx ingress）
   ├── "/"      → Frontend Service → Frontend Pod（Nginx 送 React build）
   └── "/api/*" → Backend Service  → Backend Pod（Express + Prisma）
                                          │  @postgres:5432（Service DNS）
                                          ▼
                                  Postgres（StatefulSet + PVC 持久化）
```

前端、後端是兩個獨立工作負載，各自打包成 image、各自一個 Deployment。前端走同源相對路徑 `/api`，經 Ingress 分流到後端，避開跨網域 CORS。

## 各 Phase 完成內容

### ✅ Phase 0 — 環境與版控準備
- 建好 monorepo（`frontend/`、`backend/`、`e2e/`、`k8s/`）與工具鏈（Docker、Node、kubectl、kind、helm）。
- `.gitignore` 排除 `node_modules`、`.env`、`dist`。

### ✅ Phase 1 — 後端 API + 資料庫（本地）
- Express + Prisma 實作 `/api/todos` 的 GET / POST / PUT / DELETE（含錯誤路徑），以及 `/health` 健康檢查。
- Prisma schema 定義 `Todo` model、`migrate` 建表、產生 Prisma Client。
- 本地以 Docker 起 PostgreSQL，`DATABASE_URL` 由 `.env` 注入。

### ✅ Phase 2 — 前端 + API 串接（本地）
- Vite + React 完成 Todo CRUD 畫面，載入時 GET、送出 POST、勾選/刪除 PUT/DELETE。
- API base URL 走 `VITE_API_URL` 環境變數，不寫死。

### ✅ Phase 3 — 測試（Vitest + Playwright）
- **後端**：Vitest 單元測試 11 支（CRUD 成功 + 錯誤路徑，mock Prisma）；DB smoke test 以 `$queryRaw` 驗證連線。
- **前端**：Vitest + jsdom + Testing Library，測元件渲染與「輸入＋新增」互動（mock fetch）。
- **E2E**：Playwright 走「開頁 → 新增 → 顯示 → 勾選 → 刪除」完整流程。
- **Lint**：ESLint gate。

### ✅ Phase 4 — 容器化（Docker）
- 前後端各自 **多階段 build** Dockerfile：builder 裝依賴/build，runtime 只留必要產物、`USER node` 非 root、alpine 基底縮小 image。
- `docker-compose.yml` 一次拉起 frontend / backend / postgres，service name 互連、Postgres 掛 volume。

### ✅ Phase 5 — 本地 K8s（kind）
- `kind-config.yaml` 用 `extraPortMappings` 把 host 80/443 接進 node。
- 安裝 ingress-nginx，`kind load` 本機 image。
- 完整 manifests：Secret / ConfigMap / Postgres（StatefulSet + PVC + headless Service）/ Backend（Deployment + probe + resources）/ Frontend（Deployment）/ Ingress（`/`→前端、`/api`→後端）。

### ✅ Phase 6 — CI（GitHub Actions）
- `.github/workflows/ci.yml`：`test-backend`（Vitest + Postgres service）、`test-frontend`（ESLint + Vitest），push 觸發、測試失敗擋下。

### ✅ Phase 7 — 部署上 GKE（含 CD）
- 啟用 GKE / Artifact Registry，CI 加 `build-and-push` job：多階段 build → 推 image 到 Artifact Registry（`:latest` + `:SHA`）。
- **Workload Identity Federation（WIF）** 免金鑰認證（OIDC，限定 repo）。
- **CD** `deploy` job：WIF 認證 → 取 GKE 憑證 → `kubectl set image ...:${SHA}` → 滾動更新。
- 踩雷修正：GKE Persistent Disk 的 `lost+found` → 設 `PGDATA=/var/lib/postgresql/data/pgdata`。
- 成本控制：建完 → 驗證 → 刪叢集 + 清孤兒 disk / LoadBalancer。

### ⬜ Phase 8 — 網域 + HTTPS（未完成，選做）
- 規劃：購買網域、保留靜態 IP、GKE Ingress + ManagedCertificate、DNS A record、前端改用正式網域。
- 前端 build 已用同源相對路徑 `/api`，為此階段預留。

### ✅ Phase 9 — 監控（Prometheus + Grafana）
- Helm 安裝 `kube-prometheus-stack`（Prometheus + Grafana + Alertmanager + kube-state-metrics + node-exporter）。
- Grafana 觀測 CPU / 記憶體 / 副本數（Pod、namespace、叢集三種粒度）。

## 額外實作（超出原計劃）

### ✅ HPA 自動擴縮
- `k8s/hpa.yaml`：backend `min 2 / max 10 / 目標 CPU 50%`。壓測驗證流量暴增時 CPU 飆升、副本 2→10 自動擴容，流量退去後（穩定期）自動縮回。

### ✅ 災難演練（Disaster Recovery Drills）
針對不同層級各故意打壞一次，觀察 K8s 自我修復（皆以 Grafana / `kubectl` 量測驗證）：

| 層級 | 演練 | 量測結果與驗證的特性 |
|---|---|---|
| 資料層 | 停 postgres（scale 0）| readiness 探針隔離故障：backend `READY` 由 `1/1 → 0/1` 但 `STATUS` 仍 `Running`（不重啟），`describe` 可見 `Readiness probe failed: 503`；DB 恢復後 Grafana 上可用副本自動由 `0 → 2` 收斂 |
| 應用層 | 強制刪除 backend pod | 多副本無單點：壓測 **60s / 50 併發 / 767 req/s，共 46,109 個請求、成功率 100%（0 失敗）**；擾動僅反映在延遲尾巴（約 9 個請求短暫升到 ~1.6s，平均 65ms、p99 0.29s）。killing 期間釘住 HPA=2 以控制變因 |
| 負載層 | 灌流量觀察 CPU | HPA 依 CPU 自動擴縮：CPU 由 `5% → 431%`（超過 50% 目標），副本 **2 → 10**；流量退去後經穩定期自動縮回（擴快、縮慢，防抖動）|

- 為此在後端加了 `/ready` readiness 端點（實際 `SELECT 1` 探 DB，失敗回 503）。
- 量測工具：`hey`（壓測成功率與延遲分布）、`kubectl get pods -w` / `get hpa -w`（事件式觀測）、Grafana（取樣式趨勢）。

## 完成度總覽

| Phase | 內容 | 狀態 |
|---|---|---|
| 0 | 環境與版控 | ✅ |
| 1 | 後端 API + DB | ✅ |
| 2 | 前端 + API 串接 | ✅ |
| 3 | 測試 | ✅ |
| 4 | 容器化 | ✅ |
| 5 | 本地 K8s（kind）| ✅ |
| 6 | CI | ✅ |
| 7 | GKE 部署 + CD | ✅ |
| 8 | 網域 + HTTPS | ⬜ 未完成 |
| 9 | 監控 | ✅ |
| ＋ | HPA + 災難演練 | ✅ |

## 本地啟動

最快的方式（Docker Compose）：

```bash
docker compose up
```

在本地 kind 叢集跑：

```bash
kind create cluster --config k8s/kind-config.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.11.3/deploy/static/provider/cloud/deploy.yaml
kubectl apply -f k8s/   # secret → configmap → postgres → backend → frontend → ingress
```

瀏覽器開 `http://localhost/`。

> ⚠️ 成本提醒：GKE 叢集會產生費用（Autopilot 依 resource request 計費、Ingress 建 LoadBalancer）。練習採「短時間密集實驗」，收工務必 `kubectl delete` 叢集並清除殘留的 disk / LoadBalancer。

## 專案結構

```
.
├── frontend/          # Vite + React（多階段 Dockerfile）
├── backend/           # Express + Prisma（多階段 Dockerfile）
│   ├── prisma/        # schema.prisma、migrations
│   └── tests/         # Vitest 單元測試
├── e2e/               # Playwright E2E
├── k8s/               # 所有 K8s manifests（含 hpa.yaml、kind-config.yaml）
├── .github/workflows/ # GitHub Actions CI/CD
└── docker-compose.yml
```
