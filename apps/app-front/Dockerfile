FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@11.7.0
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/app-front/package.json ./apps/app-front/
COPY apps/admin-panel/package.json ./apps/admin-panel/
RUN pnpm install --filter app-front... --frozen-lockfile
COPY apps/app-front ./apps/app-front
RUN pnpm --filter app-front build

FROM nginx:stable-alpine
COPY --from=builder /app/apps/app-front/dist /usr/share/nginx/html
COPY apps/app-front/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 4040
CMD ["nginx", "-g", "daemon off;"]
