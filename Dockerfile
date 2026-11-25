FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends chromium chromium-sandbox fonts-dejavu-core && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src
COPY --chown=node:node web ./web
COPY --chown=node:node migrations ./migrations
COPY --chown=node:node scripts ./scripts
RUN mkdir -p /app/data /app/backups && chown node:node /app/data /app/backups
USER node
ENV HOST=0.0.0.0 PORT=3000
EXPOSE 3000
CMD ["node","src/server.js"]
