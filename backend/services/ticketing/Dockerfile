FROM fenap-shared-local

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY . .

# Create uploads directory for ticket attachments
RUN mkdir -p uploads/tickets

# Expose port
EXPOSE 3007

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3007/health || exit 1

# Start the service
CMD ["npm", "start"]