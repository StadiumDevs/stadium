# Use Node.js LTS version
FROM node:20-alpine

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Expose the port the app runs on
EXPOSE 2000

# Set environment to production
ENV NODE_ENV=production

# Start the server
CMD ["node", "server.js"]

