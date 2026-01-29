# Use Node.js LTS version
FROM node:20-alpine

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

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

