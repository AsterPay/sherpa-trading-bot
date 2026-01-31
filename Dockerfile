FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY dashboard/package*.json ./dashboard/

# Install dependencies
RUN npm ci
WORKDIR /app/dashboard
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build trading agent
RUN npm run build || true

# Build dashboard
WORKDIR /app/dashboard
COPY --from=deps /app/dashboard/node_modules ./node_modules
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 trading

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Copy dashboard
COPY --from=builder /app/dashboard/.next ./dashboard/.next
COPY --from=builder /app/dashboard/node_modules ./dashboard/node_modules
COPY --from=builder /app/dashboard/package.json ./dashboard/

# Create data directory
RUN mkdir -p /app/data /app/logs && chown -R trading:nodejs /app

USER trading

EXPOSE 3000

# Start both services
CMD ["sh", "-c", "node dist/trading-agent.js & cd dashboard && npm start"]
