# Base image with shared code and dependencies
FROM node:22.20.0-alpine

# Create app directory
WORKDIR /app

# Create nodejs user first
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Install shared dependencies globally
RUN npm install -g dotenv axios amqplib jsonwebtoken mysql2

# Copy all files from the shared directory (current directory)
COPY . ./shared

# Set permissions for nodejs user
RUN chown -R nodejs:nodejs /app

# This base image will be used by all services