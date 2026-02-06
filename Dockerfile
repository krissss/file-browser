# Multi-stage build for optimized production image
# Stage 1: Dependencies
FROM node:24-alpine AS deps
WORKDIR /app

# Enable corepack to use pnpm version from package.json
RUN corepack enable

# Copy dependency files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Stage 2: Builder
FROM node:24-alpine AS builder
WORKDIR /app

# Enable corepack to use pnpm version from package.json
RUN corepack enable

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED 1

# Build application
RUN pnpm build

# Stage 3: Runner
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create a non-root user with explicit UID/GID
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Create .next directory with correct permissions
RUN mkdir -p .next && chown nextjs:nodejs .next

# Copy standalone output and static files
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Set the correct permission for prerender cache
RUN mkdir -p .next/cache && chown nextjs:nodejs .next/cache

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set environment
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Start the application
CMD ["node", "server.js"]
