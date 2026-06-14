FROM node:20-alpine

WORKDIR /app

# npm install のキャッシュを効かせるため、先に package.json をコピー
COPY package*.json ./
RUN npm install

# ソースコードをコピー
COPY . .

EXPOSE 3000

# 開発サーバーを起動
CMD ["npm", "run", "dev"]
