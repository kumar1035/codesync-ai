FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache dumb-init
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 4007
ENTRYPOINT ["dumb-init","--"]
CMD ["node","-r","tsx/cjs","src/index.ts"]
