FROM ghcr.io/puppeteer/puppeteer:latest

USER root
WORKDIR /app

COPY package*.json ./
RUN npm install

# Forzar a Puppeteer a descargar e instalar la versión correcta de Chrome en el contenedor
RUN npx puppeteer browsers install chrome

COPY . .

CMD ["node", "index.js"]
