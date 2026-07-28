# Dockerfile (at the root)
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root configurations
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Install all dependencies (needed for build)
RUN npm install

# Copy the entire monorepo source
COPY . .

# Which app to build — passed in via docker-compose (api or worker)
ARG APP_NAME
RUN npm run build ${APP_NAME}

# --- Production Image ---
FROM node:20-alpine

# netcat is needed by entrypoint.sh to wait for Postgres to be reachable
RUN apk add --no-cache netcat-openbsd

ARG APP_NAME
ENV TARGET_APP=${APP_NAME}

WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist/apps/${APP_NAME} ./dist
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/app/entrypoint.sh"]
