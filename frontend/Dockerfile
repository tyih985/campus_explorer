FROM node:20-bullseye-slim
WORKDIR /app

# Install build tools
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 build-essential \
 && rm -rf /var/lib/apt/lists/*

# Copy only package.json + lockfile first (better cache)
COPY package*.json ./


RUN npm install --no-audit --progress=false
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
