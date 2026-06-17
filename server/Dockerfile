# Use Node.js LTS version
FROM node:20-alpine

# Install build dependencies for native modules. Retry on transient Alpine
# mirror/network failures (apk exit 15) so a flaky CDN can't break a deploy.
RUN for i in 1 2 3 4 5; do \
      apk add --no-cache python3 make g++ && break; \
      echo "apk add failed (attempt $i), retrying in 5s..."; sleep 5; \
    done

# Set working directory
WORKDIR /app

# Copy package files and local dependencies first
COPY package*.json ./
COPY .papi ./.papi

# Install dependencies (use npm install for local file dependencies)
RUN npm install --omit=dev

# Copy application files
COPY . .

# Expose the port the app runs on
EXPOSE 2000

# Set environment to production
ENV NODE_ENV=production

# Start the server
CMD ["node", "server.js"]

