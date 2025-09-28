# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production=false

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:1-alpine

RUN echo "server {listen 80; root /html/; \
          location / {try_files \$uri /index.html;}}" > /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /html

CMD ["nginx", "-g", "daemon off;"]