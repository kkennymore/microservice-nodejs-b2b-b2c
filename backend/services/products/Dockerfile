FROM fenap-shared-local

USER root
RUN apk add --no-cache curl

COPY package*.json ./

RUN npm install --production && npm cache clean --force

COPY . .

RUN mkdir -p uploads && chown -R nodejs:nodejs uploads

# nodejs user already exists in base image, just set ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3002/health || exit 1

CMD ["npm", "start"]