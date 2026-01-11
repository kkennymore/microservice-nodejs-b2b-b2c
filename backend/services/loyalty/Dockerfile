FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN if [ -f package-lock.json ]; then npm ci --only=production; else npm install --production; fi && npm cache clean --force

COPY . .

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 9017

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:9017/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

CMD ["npm", "start"]