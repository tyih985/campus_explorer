# frontend/Dockerfile
FROM node:20-bullseye-slim

WORKDIR /app

# Install build tools (keep minimal)
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 build-essential \
 && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

# If you have package-lock.json, use npm ci. Otherwise npm install
RUN if [ -f package-lock.json ]; then npm ci --prefer-offline --no-audit --progress=false; else npm install --no-audit --progress=false; fi

COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
