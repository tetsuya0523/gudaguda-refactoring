# gudaguda-refactoring

グダグダリファクトリングの開発者向け説明書です。

## ディレクトリ構成
- `frontend/`: Next.js (SPA/PWA)
- `backend/`: FastAPI
- `agents/`: Google ADK関連エージェント (予定)
- `infra/`: GCPインフラ関連
- `docs/`: 設計資料
- `.github/workflows/`: CI/CD

## 開発環境の起動方法

DockerとDocker Composeを使用して、フロントエンド、バックエンド、Elasticsearchの環境を一括で立ち上げます。

```bash
docker-compose up --build
```

- **Frontend (Next.js)**: http://localhost:3000
- **Backend (FastAPI)**: http://localhost:8000
- **Elasticsearch**: http://localhost:9200

## 初回セットアップ
`.env.example` をコピーして `.env` を作成してください。
```bash
cp .env.example .env
```
