FROM redis:7-alpine

# Expose port
EXPOSE 6379

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD redis-cli ping || exit 1

# Start Redis with default configuration
CMD ["redis-server"]