FROM node:20-alpine

# Gerekli build araçları (better-sqlite3 için)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Önce bağımlılıkları kopyala (cache için)
COPY package*.json ./
RUN npm install --production

# Kaynak kodları kopyala
COPY . .

# Data klasörünü oluştur (Railway Volume mount noktası: /app/data)
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "server.js"]
