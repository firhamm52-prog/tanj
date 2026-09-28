FROM node:24-alpine
WORKDIR /app
COPY package.json ./
COPY services ./services
COPY scripts ./scripts
COPY database ./database
COPY shared ./shared
COPY web ./web
COPY admin ./admin
COPY assets ./assets
COPY index.html ./
RUN mkdir /app/data && chown node:node /app/data
USER node
EXPOSE 3000
CMD ["node", "scripts/start.mjs"]
