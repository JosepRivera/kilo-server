# Base: official Bun image, slim variant (no build tools, smaller)
FROM oven/bun:1-slim AS base
WORKDIR /app

# Dependencies: production packages only, Bun cache kept between builds
FROM base AS deps
COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --production

# Runtime: final image that runs the server
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY src ./src
COPY drizzle ./drizzle
USER bun
EXPOSE 3000
CMD ["bun", "run", "docker:start"]
