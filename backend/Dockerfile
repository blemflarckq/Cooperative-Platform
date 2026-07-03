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

# Use an argument to define which app to build (defaulting to api)
ARG APP_NAME
#The file reads the actual APP_NAME from docker-compose
#commented because package.json scripts section might not handle arguments correctly
RUN npm run build ${APP_NAME}
#Using npx instead ignores the build script in package.json
#RUN npx nest build ${APP_NAME}
#RUN npm run build

# --- Production Image ---
FROM node:20-alpine

ARG APP_NAME
ENV TARGET_APP=${APP_NAME}

WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist/apps/${APP_NAME} ./dist

# 1. COPY THE ENTRYPOINT SCRIPT
# Assuming your script is at: apps/api/entrypoint.sh
#COPY apps/api/entrypoint.sh /app/entrypoint.sh

# 2. MAKE IT EXECUTABLE
#RUN chmod +x /app/entrypoint.sh

# We pass the APP_NAME again to the runtime stage


EXPOSE 3000

# Run the specific app from the dist folder
#CMD node dist/apps/${TARGET_APP}/main.js
# 3. REPLACE CMD WITH ENTRYPOINT
# This ensures the script sruns first, then starts the app
#ENTRYPOINT ["/app/entrypoint.sh"]

# Temporary debug line - put this right before CMD
RUN ls -la /app/dist/api/src && ls -la /app/dist/worker/src || echo "Subfolder not found"

#CMD node dist/apps/${TARGET_APP}/main.js
#CMD ["node", "dist/main.js"]

# Use a shell string to check both common locations
# We use this because the structure are different as worker directly depends on the common module of api
CMD ["sh", "-c", "if [ -f dist/${TARGET_APP}/src/main.js ]; then node dist/${TARGET_APP}/src/main.js; else node dist/main.js; fi"]