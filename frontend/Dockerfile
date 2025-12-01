FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:20-slim AS runner

WORKDIR /app

# Copy built files and server
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./server.js

ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

CMD ["node", "server.js"]
