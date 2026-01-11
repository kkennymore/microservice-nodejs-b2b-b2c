FROM fenap-shared-local

USER root
RUN apk add --no-cache curl

COPY package*.json ./

RUN npm install --production && npm cache clean --force

COPY . .

# nodejs user already exists in base image, just set ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3004

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3004/health || exit 1

CMD ["npm", "start"]