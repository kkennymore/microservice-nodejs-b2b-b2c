FROM mariadb:10.11

# Copy initialization scripts
COPY init/ /docker-entrypoint-initdb.d/

# Set correct permissions
RUN chmod -R 755 /docker-entrypoint-initdb.d/

# Expose port
EXPOSE 3306

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD mysqladmin ping -h localhost || exit 1