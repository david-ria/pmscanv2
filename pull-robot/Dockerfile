# ---------- Build stage ----------
FROM node:20-alpine AS build
WORKDIR /app

# Native deps for better-sqlite3 during build
RUN apk add --no-cache python3 make g++

# Install all deps (incl. dev) to run TypeScript build
COPY package*.json ./
RUN npm ci

# Copy sources and build
COPY . .
RUN npm run build

# ---------- Runtime stage ----------
FROM node:20-alpine AS runtime
WORKDIR /app

# Only what we need at runtime
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled JS and necessary runtime assets
COPY --from=build /app/dist ./dist
COPY --from=build /app/data ./data
COPY --from=build /app/README.md ./README.md

# Ensure data dir exists (for SQLite + sensor_map.csv)
RUN mkdir -p /app/data

# Health port (make sure app respects PORT env)
ENV PORT=3000
EXPOSE 3000

# Built‑in Dockerfile healthcheck (uses Node's global fetch)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Start compiled app
CMD ["node","dist/index.js"]