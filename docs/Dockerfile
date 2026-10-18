# Dev image for the Astro docs site (production is deployed on Vercel)
FROM oven/bun:1
WORKDIR /app
# Astro writes .astro/ and node_modules/.vite at runtime, so the bun user must own /app
RUN chown bun:bun /app
USER bun

# Dependencies: cached until package.json or bun.lock change
COPY --chown=bun:bun package.json bun.lock ./
RUN bun install --frozen-lockfile

# Source: compose watch syncs changes over this copy
COPY --chown=bun:bun . .
EXPOSE 4321
CMD ["bun", "run", "docker:start"]
