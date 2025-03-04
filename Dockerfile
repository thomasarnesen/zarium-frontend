# Build stage
FROM node:18-alpine AS build
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine

# Install required tools
RUN apk add --no-cache bash

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Verify the index.html exists and contains DOCTYPE
RUN if [ ! -f /usr/share/nginx/html/index.html ]; then echo "index.html not found"; exit 1; fi && \
    if ! grep -q "<!DOCTYPE html>" /usr/share/nginx/html/index.html; then echo "DOCTYPE missing"; exit 1; fi

# Create self-test script
RUN echo '#!/bin/bash\ngrep -q "<!DOCTYPE html>" /usr/share/nginx/html/index.html' > /docker-healthcheck.sh && \
    chmod +x /docker-healthcheck.sh

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s CMD /docker-healthcheck.sh

# Expose port 5176
EXPOSE 5176

# Start nginx
CMD ["nginx", "-g", "daemon off;"]