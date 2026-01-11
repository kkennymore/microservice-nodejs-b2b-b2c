FROM rabbitmq:3.12-management-alpine

# Enable required plugins
RUN rabbitmq-plugins enable --offline \
    rabbitmq_management \
    rabbitmq_prometheus \
    rabbitmq_shovel \
    rabbitmq_shovel_management

# Copy custom configuration
COPY rabbitmq.conf /etc/rabbitmq/rabbitmq.conf
COPY definitions.json /etc/rabbitmq/definitions.json

# Set permissions (rabbitmq user/group already exist in base image)
RUN chown -R rabbitmq:rabbitmq /etc/rabbitmq/

# Switch to rabbitmq user
USER rabbitmq

# Expose ports
EXPOSE 5672 15672

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD rabbitmq-diagnostics ping || exit 1

# Start RabbitMQ
CMD ["rabbitmq-server"]