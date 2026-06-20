# ローカル開発環境セットアップ手順

> エージェントをローカルで動かすまでの手順書。  
> チームメンバーは全員この手順を完了してから開発を始めてください。

---

## 前提条件

以下がインストール済みであること。

| ツール | 確認コマンド | インストール先 |
|---|---|---|
| Python 3.11以上 | `python3 --version` | [python.org](https://www.python.org/downloads/) |
| Docker Desktop | `docker --version` | [docker.com](https://www.docker.com/products/docker-desktop/) |
| gcloud CLI | `gcloud version` | [インストール手順](#1-gcloud-cliのインストール) |
| Git | `git --version` | 通常プリインストール済み |

---

## 1. gcloud CLIのインストール

```bash
# Mac (Homebrew)
brew install --cask google-cloud-sdk

# インストール後にシェルを再読み込み
exec -l $SHELL

# インストール確認
gcloud version
```

---

## 2. GCPプロジェクトへのアクセス設定

> **前提**: プロジェクト管理者にGCPプロジェクトへの招待を依頼してください。  
> 招待メールが届いたら承認してから以下を実行します。

```bash
# Googleアカウントでログイン
gcloud auth login

# プロジェクトをセット
gcloud config set project agent-hackathon-499223

# アプリケーションデフォルト認証（ADK/Vertex AIが使う認証）
gcloud auth application-default login
```

ブラウザが開くので、GCPプロジェクトに招待されたGoogleアカウントでログインしてください。

### 認証確認

```bash
gcloud auth list
# → ACTIVE アカウントが表示されればOK

gcloud config get-value project
# → agent-hackathon-499223 が表示されればOK
```

---

## 3. リポジトリのクローン

```bash
git clone https://github.com/tetsuya0523/gudaguda-refactoring.git
cd gudaguda-refactoring
git checkout feature/adk-agents-setup
```

---

## 4. 環境変数の設定

```bash
cp .env.example .env
```

`.env` をエディタで開き、以下を確認・編集します。

```env
# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000

# Backend - Elasticsearch
ELASTICSEARCH_URL=http://elasticsearch:9200

# Backend - Vertex AI (ADK)
GOOGLE_CLOUD_PROJECT=agent-hackathon-499223
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_GENAI_USE_VERTEXAI=true
```

> `.env` はgitignoreされているので **絶対にcommitしないでください**。

---

## 5. 起動方法

### A. Docker Compose（全サービスまとめて起動・推奨）

```bash
docker-compose up --build
```

| サービス | URL |
|---|---|
| フロントエンド (Next.js) | http://localhost:3000 |
| バックエンド (FastAPI) | http://localhost:8000 |
| Elasticsearch | http://localhost:9200 |

停止：
```bash
docker-compose down
```

---

### B. エージェント単体をローカルで動かす（ADK Web UI）

Docker不要でエージェントだけ動作確認したい場合。

```bash
# Python仮想環境の作成
python3 -m venv .venv
source .venv/bin/activate

# 依存パッケージのインストール
pip install -r backend/requirements.txt

# エージェントの起動（ブラウザUIが開く）
PYTHONPATH=. adk web agents/orchestrator      # オーケストレーター（振り分け）
PYTHONPATH=. adk web agents/task_extractor    # タスク抽出エージェント単体
PYTHONPATH=. adk web agents/task_proposer     # タスク提案エージェント単体
```

→ http://localhost:8000 がブラウザで開きます。

---

### C. バックエンドのみローカルで起動

```bash
source .venv/bin/activate
cd backend
uvicorn main:app --reload
```

→ http://localhost:8000

---

## 6. 動作確認

バックエンドが起動したら以下のエンドポイントで確認できます。

```bash
# ヘルスチェック
curl http://localhost:8000/

# タスク抽出エージェント
curl -X POST http://localhost:8000/api/extract \
  -H "Content-Type: application/json" \
  -d '{"text": "明日スーパー行かないと。ADKのドキュメントも読みたい。"}'

# タスク提案エージェント
curl -X POST http://localhost:8000/api/propose \
  -H "Content-Type: application/json" \
  -d '{"message": "今グダグダしてる。何かやることある？"}'

# オーケストレーター（チャット）
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "やること整理したい"}'
```

---

## よくあるエラー

### `PERMISSION_DENIED` / `403 Forbidden`

GCPプロジェクトへのアクセス権がありません。  
→ プロジェクト管理者に招待を依頼するか、以下を再実行してください。

```bash
gcloud auth application-default login
```

### `429 RESOURCE_EXHAUSTED`

Vertex AIのクォータ超過またはクレジット不足です。  
→ GCPプロジェクトのコンソールで課金状況を確認してください。

### `Cannot connect to the Docker daemon`

Docker Desktopが起動していません。  
→ Docker Desktopアプリを起動してからコマンドを再実行してください。

### `ModuleNotFoundError: No module named 'agents'`

Pythonの実行ディレクトリが正しくありません。  
→ リポジトリのルート（`gudaguda-refactoring/`）から実行してください。

```bash
# NG
cd backend && uvicorn main:app

# OK
uvicorn backend.main:app  # ルートから実行
# または
cd gudaguda-refactoring && adk web agents/orchestrator
```

---

## エージェント構成

```
agents/
├── orchestrator/       ← 入力を判断して振り分け（メインエントリ）
├── task_extractor/     ← ボイスメモ・テキストからタスクを抽出
└── task_proposer/      ← 時間帯・状況から今やるべきタスクを提案
```

各エージェントはモデルに `gemini-2.5-flash`（Vertex AI経由）を使用しています。
