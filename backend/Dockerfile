FROM python:3.11-slim

WORKDIR /app

# 依存関係をインストール
COPY requirements.txt ./
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ソースコードをコピー
COPY . .

EXPOSE 8000

# 開発サーバーを起動 (リロード有効)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
