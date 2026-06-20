FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY src ./src
COPY tsconfig.json tsconfig.seed.json ./
RUN npx tsc
RUN npx tsc --project tsconfig.seed.json
RUN npm prune --production
CMD ["npm", "start"]
