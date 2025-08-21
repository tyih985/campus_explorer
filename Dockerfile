FROM node:alpine

WORKDIR /app

COPY package*.json ./
COPY . .
RUN npm install


EXPOSE 4321
CMD ["npm", "run", "start"]
