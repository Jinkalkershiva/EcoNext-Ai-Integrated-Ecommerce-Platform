# Multi-stage production build for EcoNext Admin React Frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Clean installation of dependencies
RUN npm ci

# Copy application source
COPY . .

# Build-time environment variable arguments for Vite
ARG VITE_API_URL
ARG VITE_WS_URL

ENV VITE_API_URL=${VITE_API_URL} \
    VITE_WS_URL=${VITE_WS_URL}

# Build production bundle
RUN npm run build

# Lightweight NGINX runtime
FROM nginx:alpine

# Configure NGINX for SPA history-mode routing and asset caching
RUN printf 'server {\n\
    listen 80;\n\
    server_name _;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
    location /assets/ {\n\
        expires 1y;\n\
        add_header Cache-Control "public, immutable";\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
