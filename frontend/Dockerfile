FROM node:22
WORKDIR /app

COPY package*.json ./
# Remove the lockfile before installing to avoid optional dep issues
RUN rm -f package-lock.json && npm install

COPY . .

ENV PORT=5173
EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
