# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build client and server
RUN npm run build

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 taskviewer

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Create data directory for files
RUN mkdir -p /data/files && chown -R taskviewer:nodejs /data

# Switch to non-root user
USER taskviewer

# Environment
ENV NODE_ENV=production
ENV PORT=3456
ENV FILE_STORAGE_PATH=/data/files

EXPOSE 3456

CMD ["node", "dist/server/index.js"]
