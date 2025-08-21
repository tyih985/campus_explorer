# root Dockerfile (backend)
FROM node:23 AS builder
WORKDIR /app

# copy package files and scripts first (for proper npm ci/postinstall)
COPY package*.json ./
COPY package-lock.json ./
COPY scripts ./scripts

# install dependencies and build
RUN npm ci
COPY . .
RUN npx tsc

FROM node:23-slim AS runtime
WORKDIR /app

# copy package files and scripts before installing prod deps
COPY package*.json ./
COPY package-lock.json ./
COPY scripts ./scripts

# install production dependencies only
RUN npm ci --omit=dev

# copy built artifacts
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=development
EXPOSE 3000
CMD ["node", "dist/src/App.js"]
