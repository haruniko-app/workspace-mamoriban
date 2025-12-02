FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json package-lock.json* ./
RUN npm ci || npm install

COPY . .
RUN npm run build

FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package*.json /app/package-lock.json* ./
RUN npm ci --only=production || npm install --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/fonts ./fonts

EXPOSE 8080

CMD ["node", "dist/index.js"]
