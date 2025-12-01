FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Use unprivileged nginx image for Cloud Run compatibility
FROM nginxinc/nginx-unprivileged:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config template
COPY nginx.conf /etc/nginx/nginx.conf.template

# Set default port (Cloud Run will override via PORT env var)
ENV PORT=8080

EXPOSE 8080

# Process template with envsubst and start nginx
CMD /bin/sh -c "envsubst '\$PORT' < /etc/nginx/nginx.conf.template > /tmp/default.conf && cp /tmp/default.conf /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"
