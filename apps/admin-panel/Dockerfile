FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@9
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/app-front/package.json ./apps/app-front/
COPY apps/admin-panel/package.json ./apps/admin-panel/
RUN pnpm install --filter admin-panel... --frozen-lockfile
COPY apps/admin-panel ./apps/admin-panel
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm --filter admin-panel build

FROM nginx:stable-alpine
COPY --from=builder /app/apps/admin-panel/dist /usr/share/nginx/html
COPY apps/admin-panel/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3030
CMD ["nginx", "-g", "daemon off;"]
