FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@9
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/app-front/package.json ./apps/app-front/
COPY apps/admin-panel/package.json ./apps/admin-panel/
RUN pnpm install --filter api... --frozen-lockfile
COPY apps/api ./apps/api
RUN pnpm --filter api build

FROM node:20-alpine AS runner
WORKDIR /app
RUN npm install -g pnpm@9
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/app-front/package.json ./apps/app-front/
COPY apps/admin-panel/package.json ./apps/admin-panel/
RUN pnpm install --prod --filter api... --frozen-lockfile
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
ENV NODE_ENV=production
ENV PORT=5050
EXPOSE 5050
CMD ["pnpm", "--filter", "api", "start"]
