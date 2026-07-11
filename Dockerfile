# Build stage
FROM node:22-alpine AS build30008

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Serve stage with nginx
FROM nginx:alpine

# Copy built files
COPY --from=build30008 /app/dist /usr/share/nginx/html

# Create nginx config with proxy for /api, /ws, /uploads to backend
RUN rm /etc/nginx/conf.d/default.conf
RUN echo 'server { \
    listen 3002; \
    client_max_body_size 50M; \
    server_name _; \
    client_max_body_size 50M; \
    \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    location /api/ { \
        proxy_pass http://127.0.0.1:8002; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
        proxy_read_timeout 120s; \
        proxy_send_timeout 120s; \
    } \
    \
    location /ws-api { \
        proxy_pass http://127.0.0.1:8002; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
    } \
    \
    location /uploads/ { \
        proxy_pass http://127.0.0.1:8002; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        add_header Cache-Control "no-cache, no-store, must-revalidate"; \
        proxy_read_timeout 120s; \
        proxy_send_timeout 120s; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 3002

CMD ["nginx", "-g", "daemon off;"]
