FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache dumb-init
COPY package*.json ./
RUN npm ci
COPY . .
ENV NODE_ENV=production
EXPOSE 4004
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "-r", "tsx/cjs", "src/index.ts"]
